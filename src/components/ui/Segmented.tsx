interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}

export const Segmented = <T extends string>({ label, value, options, onChange }: SegmentedProps<T>) => (
  <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
    <span className="text-sm text-muted">{label}</span>
    <div className="flex">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={option.id === value}
          onClick={() => onChange(option.id)}
          className={`h-11 flex-1 px-3 text-sm font-medium transition-colors duration-150 ${
            option.id === value ? 'bg-action text-on-action' : 'bg-raised text-content hover:bg-line/40'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);
