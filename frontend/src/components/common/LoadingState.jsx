export function LoadingState({ label = "Loading..." }) {
  return (
    <div className="panel flex min-h-52 items-center justify-center px-6 py-12">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}
