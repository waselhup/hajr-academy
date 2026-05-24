"use client";

import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import type { Editor } from "tldraw";

const BRAND_COLORS = ["#2C3E50", "#B86E7B", "#B5E5D8", "#D4C5E2"];
const BROADCAST_THROTTLE_MS = 50;
const AUTOSAVE_INTERVAL_MS = 30_000;

function colorFromUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return BRAND_COLORS[Math.abs(hash) % BRAND_COLORS.length];
}

export interface Peer {
  userId: string;
  userName: string;
  color: string;
  isHost: boolean;
  lastSeenAt: string;
}

export interface BlackboardSyncConfig {
  roomId: string;
  userId: string;
  userName: string;
  isHost: boolean;
  canEdit: boolean;
  onPresenceUpdate?: (peers: Peer[]) => void;
  onSnapshotLoad?: (snapshot: unknown) => void;
  onPermissionChange?: (granted: boolean) => void;
}

export class BlackboardSync {
  private editor: Editor | null = null;
  private channel: RealtimeChannel | null = null;
  private supabase: SupabaseClient;
  private config: BlackboardSyncConfig;
  private broadcastTimer: ReturnType<typeof setTimeout> | null = null;
  private autosaveTimer: ReturnType<typeof setInterval> | null = null;
  private pendingChanges: unknown[] = [];
  private unsubscribeStore: (() => void) | null = null;
  private connected = false;

  constructor(config: BlackboardSyncConfig) {
    this.config = config;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  async connect(editor: Editor) {
    this.editor = editor;
    this.connected = true;

    const snapshot = await this.loadSnapshot();
    if (snapshot) {
      this.config.onSnapshotLoad?.(snapshot);
    }

    this.channel = this.supabase.channel(`blackboard:${this.config.roomId}`, {
      config: { broadcast: { self: false } },
    });

    this.channel
      .on("broadcast", { event: "tldraw-changes" }, (payload) => {
        if (!this.editor || !this.connected) return;
        const data = payload.payload as { records: unknown; fromUserId: string };
        if (data.fromUserId === this.config.userId) return;
        try {
          this.editor.store.mergeRemoteChanges(() => {
            const records = data.records as Record<string, unknown>[];
            if (Array.isArray(records)) {
              for (const record of records) {
                if (record && typeof record === "object" && "typeName" in record) {
                  this.editor!.store.put([record as any]);
                }
              }
            }
          });
        } catch {
          // Ignore merge errors from stale records
        }
      })
      .on("broadcast", { event: "tldraw-remove" }, (payload) => {
        if (!this.editor || !this.connected) return;
        const data = payload.payload as { ids: string[]; fromUserId: string };
        if (data.fromUserId === this.config.userId) return;
        try {
          this.editor.store.mergeRemoteChanges(() => {
            this.editor!.store.remove(data.ids as any);
          });
        } catch {
          // Ignore
        }
      })
      .on("broadcast", { event: "permission-granted" }, (payload) => {
        const data = payload.payload as { studentId: string };
        if (data.studentId === this.config.userId) {
          this.config.canEdit = true;
          this.config.onPermissionChange?.(true);
        }
      })
      .on("broadcast", { event: "permission-revoked" }, (payload) => {
        const data = payload.payload as { studentId: string };
        if (data.studentId === this.config.userId) {
          this.config.canEdit = false;
          this.config.onPermissionChange?.(false);
        }
      })
      .on("presence", { event: "sync" }, () => {
        if (!this.channel) return;
        const state = this.channel.presenceState();
        const peers: Peer[] = [];
        for (const key of Object.keys(state)) {
          const presences = state[key] as unknown as Peer[];
          if (presences?.[0]) peers.push(presences[0]);
        }
        this.config.onPresenceUpdate?.(peers);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await this.channel!.track({
            userId: this.config.userId,
            userName: this.config.userName,
            color: colorFromUserId(this.config.userId),
            isHost: this.config.isHost,
            lastSeenAt: new Date().toISOString(),
          });
        }
      });

    this.unsubscribeStore = this.editor.store.listen(
      (entry) => {
        if (!this.connected || !this.config.canEdit) return;
        const { changes } = entry;
        const added = Object.values(changes.added);
        const updated = Object.values(changes.updated).map(([, after]) => after);
        const removed = Object.keys(changes.removed);

        if (added.length > 0 || updated.length > 0) {
          this.pendingChanges.push(...added, ...updated);
          this.scheduleBroadcast();
        }
        if (removed.length > 0) {
          this.channel?.send({
            type: "broadcast",
            event: "tldraw-remove",
            payload: { ids: removed, fromUserId: this.config.userId },
          });
        }
      },
      { source: "user", scope: "document" }
    );

    if (this.config.isHost) {
      this.autosaveTimer = setInterval(() => this.saveSnapshot(), AUTOSAVE_INTERVAL_MS);
    }
  }

  private scheduleBroadcast() {
    if (this.broadcastTimer) return;
    this.broadcastTimer = setTimeout(() => {
      this.broadcastTimer = null;
      if (this.pendingChanges.length === 0) return;
      const records = [...this.pendingChanges];
      this.pendingChanges = [];
      this.channel?.send({
        type: "broadcast",
        event: "tldraw-changes",
        payload: { records, fromUserId: this.config.userId },
      });
    }, BROADCAST_THROTTLE_MS);
  }

  private async loadSnapshot(): Promise<unknown | null> {
    try {
      const res = await fetch(`/api/blackboard/${this.config.roomId}/snapshot`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.snapshot;
    } catch {
      return null;
    }
  }

  async saveSnapshot(): Promise<boolean> {
    if (!this.editor) return false;
    try {
      const snapshot = this.editor.store.getStoreSnapshot();
      const res = await fetch(`/api/blackboard/${this.config.roomId}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot }),
      });
      return res.ok || res.status === 202;
    } catch {
      return false;
    }
  }

  disconnect() {
    this.connected = false;
    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }
    if (this.broadcastTimer) {
      clearTimeout(this.broadcastTimer);
      this.broadcastTimer = null;
    }
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.editor = null;
  }

  broadcastPermissionChange(studentId: string, granted: boolean) {
    this.channel?.send({
      type: "broadcast",
      event: granted ? "permission-granted" : "permission-revoked",
      payload: { studentId },
    });
  }

  get isConnected() {
    return this.connected;
  }
}
