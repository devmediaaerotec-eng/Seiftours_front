import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

const button = cva(
  'inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-brand-600 text-white shadow-xs hover:bg-brand-700 focus-visible:outline-brand-600',
        accent: 'bg-linear-to-r from-orange-500 to-gold-400 text-slate-900 shadow-xs hover:brightness-105 focus-visible:outline-orange-500',
        secondary: 'bg-white text-slate-700 shadow-xs ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:outline-brand-600',
        ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-brand-600',
        danger: 'bg-red-600 text-white shadow-xs hover:bg-red-700 focus-visible:outline-red-600',
        'danger-soft': 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-100 focus-visible:outline-red-600',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-sm',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

/** type="button" par défaut : ajoutez type="submit" dans les formulaires. */
export default function Button({ variant, size, loading, icon: Icon, className, children, disabled, type, as: Tag = 'button', ...props }) {
  const isButton = Tag === 'button';
  return (
    <Tag
      className={cn(button({ variant, size }), className)}
      {...(isButton ? { type: type ?? 'button', disabled: disabled || loading } : {})}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon ? <Icon className="size-4" /> : null}
      {children}
    </Tag>
  );
}