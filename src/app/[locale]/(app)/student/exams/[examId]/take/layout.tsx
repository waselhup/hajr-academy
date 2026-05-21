/**
 * Fullscreen overlay for the exam-taking experience — hides the app
 * sidebar and topbar so the student is distraction-free, mirroring the
 * blackboard fullscreen pattern.
 */
export default function ExamTakeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-ivory">
      {children}
    </div>
  );
}
