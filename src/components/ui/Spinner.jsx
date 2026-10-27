import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export default function Spinner({ className }) {
  return <Loader2 className={cn('size-5 animate-spin text-brand-600', className)} aria-label="Chargement" />;
}

export function PageLoader() {
  return <div className="flex min-h-[40vh] items-center justify-center"><Spinner className="size-7" /></div>;
}