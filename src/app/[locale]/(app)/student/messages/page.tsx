import { redirect } from "next/navigation";

/** Legacy route — the universal chat lives at /messages. */
export default function StudentMessagesPage() {
  redirect("/messages");
}
