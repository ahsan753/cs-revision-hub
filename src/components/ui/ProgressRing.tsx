interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}

export function ProgressRing({
  value,
  size = 64,
  stroke = 7,
  color = "#4f46e5",
  label,
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} aria-hidden="true" className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--progress-ring-track, #e2e8f0)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-sm font-extrabold text-ink">
        {label ?? `${value}%`}
      </span>
    </div>
  );
}
