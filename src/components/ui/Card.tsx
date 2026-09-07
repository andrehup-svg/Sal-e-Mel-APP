export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-card border border-borda bg-papel p-5 ${className}`}>{children}</div>
  );
}
