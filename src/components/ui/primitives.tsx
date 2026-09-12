import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import { ArrowUpRight } from "lucide-react";

// ----------------------------------------------------------------------------
// Card
// ----------------------------------------------------------------------------
export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-3xl border border-stone-200/70 bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur-sm",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Button
// ----------------------------------------------------------------------------
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-forest-600 text-cream-50 hover:bg-forest-500 active:bg-forest-700 shadow-[0_2px_0_0_rgba(15,28,20,0.25)] active:shadow-none active:translate-y-[1px]",
  secondary:
    "bg-cream-200 text-stone-800 hover:bg-cream-300 active:bg-stone-200 border border-stone-200",
  ghost: "bg-transparent text-stone-700 hover:bg-stone-100 active:bg-stone-200",
  danger:
    "bg-danger-500 text-cream-50 hover:bg-danger-600 shadow-[0_2px_0_0_rgba(120,30,20,0.3)] active:shadow-none active:translate-y-[1px]",
  outline: "bg-transparent border border-stone-300 text-stone-700 hover:bg-stone-100",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "text-xs px-3 py-1.5 gap-1.5 rounded-lg",
  md: "text-sm px-4 py-2.5 gap-2 rounded-xl",
  lg: "text-base px-6 py-3.5 gap-2.5 rounded-2xl",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center font-semibold transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

// ----------------------------------------------------------------------------
// Badge
// ----------------------------------------------------------------------------
type BadgeTone = "forest" | "amber" | "danger" | "sky" | "stone";

const badgeTones: Record<BadgeTone, string> = {
  forest: "bg-forest-100 text-forest-700 border-forest-200",
  amber: "bg-amber-400/15 text-amber-600 border-amber-400/30",
  danger: "bg-danger-500/10 text-danger-600 border-danger-500/25",
  sky: "bg-sky-400/10 text-sky-500 border-sky-400/25",
  stone: "bg-stone-100 text-stone-600 border-stone-200",
};

export function Badge({
  tone = "stone",
  children,
  className,
  icon,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
        badgeTones[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}

// ----------------------------------------------------------------------------
// Progress bar
// ----------------------------------------------------------------------------
export function ProgressBar({
  value,
  max = 100,
  tone = "forest",
  className,
  trackClassName,
}: {
  value: number;
  max?: number;
  tone?: "forest" | "sky" | "amber" | "danger" | "stone";
  className?: string;
  trackClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const toneClass: Record<string, string> = {
    forest: "bg-forest-500",
    sky: "bg-sky-500",
    amber: "bg-amber-500",
    danger: "bg-danger-500",
    stone: "bg-stone-500",
  };
  return (
    <div className={clsx("h-2 w-full overflow-hidden rounded-full bg-stone-200", trackClassName)}>
      <div
        className={clsx("h-full rounded-full transition-[width] duration-700 ease-out", toneClass[tone], className)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Radial progress
// ----------------------------------------------------------------------------
export function RadialProgress({
  value,
  size = 168,
  strokeWidth = 14,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: ReactNode;
  sublabel?: ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-stone-200)"
          strokeWidth={strokeWidth}
        />
        <defs>
          <linearGradient id="radial-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-forest-400)" />
            <stop offset="100%" stopColor="var(--color-forest-600)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#radial-grad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label}
        {sublabel}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Section heading
// ----------------------------------------------------------------------------
export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-forest-500">{eyebrow}</p>
        )}
        <h1 className="font-display text-[28px] font-extrabold leading-tight text-stone-900 md:text-[32px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 max-w-xl text-[15px] text-stone-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Stat tile
// ----------------------------------------------------------------------------
export function StatTile({
  label,
  value,
  detail,
  tone = "forest",
  icon,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: BadgeTone;
  icon?: ReactNode;
}) {
  const toneText: Record<BadgeTone, string> = {
    forest: "text-forest-600",
    amber: "text-amber-600",
    danger: "text-danger-600",
    sky: "text-sky-500",
    stone: "text-stone-600",
  };
  return (
    <Card className="flex flex-col gap-2.5 p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">{label}</p>
        {icon && <span className={toneText[tone]}>{icon}</span>}
      </div>
      <p className={clsx("font-display text-xl font-extrabold", toneText[tone])}>{value}</p>
      {detail && <p className="text-xs text-stone-400">{detail}</p>}
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Action card — large tappable card for "do the next real thing" navigation
// (e.g. Explore's bottom action row). variant="ultra" is a richer visual
// treatment for the same real onClick — it never changes what the card does.
// ----------------------------------------------------------------------------
export function ActionCard({
  icon,
  title,
  description,
  onClick,
  variant = "simple",
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  onClick?: () => void;
  variant?: "simple" | "ultra";
  className?: string;
}) {
  const ultra = variant === "ultra";
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "group flex flex-col items-start gap-2.5 rounded-2xl border p-4 text-left transition-all duration-200",
        ultra
          ? "border-forest-100/10 bg-forest-950/85 text-cream-50 shadow-[var(--shadow-lift)] backdrop-blur hover:border-forest-400/40 hover:bg-forest-900/90"
          : "border-stone-200 bg-white/95 text-stone-900 shadow-[var(--shadow-soft)] backdrop-blur hover:border-forest-300 hover:bg-forest-50/60",
        className
      )}
    >
      <div className="flex w-full items-center justify-between">
        <div
          className={clsx(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            ultra ? "bg-forest-400/15 text-forest-300" : "bg-forest-100 text-forest-600"
          )}
        >
          {icon}
        </div>
        <ArrowUpRight
          size={16}
          className={clsx(
            "transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
            ultra ? "text-stone-500 group-hover:text-forest-300" : "text-stone-300 group-hover:text-forest-500"
          )}
        />
      </div>
      <p className={clsx("font-display text-sm font-extrabold leading-tight", ultra ? "text-cream-50" : "text-stone-900")}>
        {title}
      </p>
      {description && (
        <p className={clsx("text-[12px] leading-snug", ultra ? "text-stone-400" : "text-stone-500")}>{description}</p>
      )}
    </button>
  );
}
