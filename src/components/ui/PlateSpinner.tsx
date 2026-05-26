export function PlateSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="plate-loader" />
      {label && (
        <span className="stencil-heading text-sm text-chalk-dim tracking-widest">{label}</span>
      )}
    </div>
  );
}
