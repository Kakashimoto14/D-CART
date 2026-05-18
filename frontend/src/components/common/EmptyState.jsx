export function EmptyState({ title, description, action }) {
  return (
    <div className="panel px-6 py-12 text-center">
      <div className="mx-auto max-w-md space-y-3">
        <h3 className="text-xl font-semibold text-ink">{title}</h3>
        <p className="text-sm leading-6 text-slate-500">{description}</p>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}
