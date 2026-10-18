import {
  Atom,
  BookOpen,
  Brain,
  Globe2,
  Languages,
  Leaf,
  PenLine,
  ScrollText,
  Sigma,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const icons: Record<string, LucideIcon> = {
  sigma: Sigma,
  atom: Atom,
  leaf: Leaf,
  pen: PenLine,
  languages: Languages,
  globe: Globe2,
  brain: Brain,
  scroll: ScrollText,
  book: BookOpen,
};

export function SubjectIcon({
  icon,
  color,
  size = 'md',
  className,
}: {
  icon: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const Icon = icons[icon] ?? BookOpen;
  const sizeClass = size === 'sm' ? 'h-8 w-8 rounded-lg' : size === 'lg' ? 'h-12 w-12 rounded-xl' : 'h-10 w-10 rounded-xl';
  const iconClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center border', sizeClass, className)}
      style={{
        backgroundColor: `${color}16`,
        borderColor: `${color}2A`,
        color,
      }}
      aria-hidden="true"
    >
      <Icon className={iconClass} strokeWidth={1.7} />
    </span>
  );
}
