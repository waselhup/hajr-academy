/** Loading skeleton for the applicant portal pages. */
export default function ApplicantLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-6">
      <div className="h-24 rounded-2xl bg-hajr-gray-100" />
      <div className="h-28 rounded-xl bg-hajr-gray-100" />
      <div className="space-y-2">
        <div className="h-5 w-40 rounded bg-hajr-gray-100" />
        <div className="h-20 rounded-xl bg-hajr-gray-100" />
        <div className="h-20 rounded-xl bg-hajr-gray-100" />
      </div>
    </div>
  );
}
