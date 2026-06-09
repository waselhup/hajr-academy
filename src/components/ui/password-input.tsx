"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Accessible label for the toggle when the password is hidden (action: show). */
  showLabel?: string;
  /** Accessible label for the toggle when the password is visible (action: hide). */
  hideLabel?: string;
}

// Shared password field with an inline-end eye / eye-off show-hide toggle.
// Wraps the base <Input>, forwards all props (including react-hook-form's
// register() spread + ref), and only manages the visible/hidden state locally.
// The toggle button is positioned at the INLINE-END (end-2) so it flips sides
// automatically under RTL, and sits out of the tab order (tabIndex={-1}) so it
// never steals focus from the field. Extra inline-end padding on the input keeps
// typed text from sliding under the icon.
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    { className, showLabel = "Show password", hideLabel = "Hide password", ...props },
    ref
  ) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pe-10", className)}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-hajr-gray-500 transition-colors hover:text-hajr-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hajr-rose/30"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";
export { PasswordInput };
