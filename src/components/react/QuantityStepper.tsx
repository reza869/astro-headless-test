// Reusable −/+ quantity control. Used in the cart drawer and PDP.
import { Minus, Plus } from 'lucide-react';
import { cn } from '~/lib/utils';

interface Props {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: 'sm' | 'md';
  /** Visual style: bordered (default, white) or soft (borderless grey pill). */
  variant?: 'bordered' | 'soft';
  ariaLabel?: string;
}

export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  size = 'md',
  variant = 'bordered',
  ariaLabel = 'Quantity',
}: Props) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  const btn =
    'grid place-items-center text-text-primary transition-fluid hover:bg-dark/[0.06] disabled:opacity-30 disabled:pointer-events-none';
  const dims = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  const iconSize = size === 'sm' ? 15 : 17;
  const soft = variant === 'soft';
  const shell = soft ? 'rounded-full bg-surface-cool' : 'border border-border rounded-md bg-surface';
  const edge = soft ? 'rounded-full' : '';

  return (
    <div
      className={cn('inline-flex items-center', shell, disabled && 'opacity-60')}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className={cn(btn, dims, soft ? edge : 'rounded-l-md')}
        onClick={dec}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        <Minus size={iconSize} strokeWidth={1.6} />
      </button>
      <span
        className={cn(
          'min-w-9 text-center font-mono tabular text-sm',
          size === 'sm' && 'min-w-7',
        )}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className={cn(btn, dims, soft ? edge : 'rounded-r-md')}
        onClick={inc}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        <Plus size={iconSize} strokeWidth={1.6} />
      </button>
    </div>
  );
}
