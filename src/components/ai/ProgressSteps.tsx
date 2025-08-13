export const ProgressSteps = ({ current, total }: { current: number; total: number }) => {
  const items = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className="flex items-center gap-2" aria-label={`Progress ${current} of ${total}`}>
      {items.map((i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full ${i <= current ? 'bg-primary' : 'bg-muted'}`}
        />
      ))}
    </div>
  );
};
