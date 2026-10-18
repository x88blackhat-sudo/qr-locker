import { Clock3, FileText } from 'lucide-react';
import type { ExamPaper } from '@shared/types';
import { cn, formatDate } from '@/lib/utils';
import { sessionLabels } from '@/lib/labels';
import { CompletionToggle } from './CompletionToggle';
import { Chip } from '@/components/ui/Badge';

interface ExamRowProps {
  paper: ExamPaper;
  onToggle: (paper: ExamPaper) => void;
  pending?: boolean;
  disabled?: boolean;
  showSubject?: boolean;
}

export function ExamRow({ paper, onToggle, pending, disabled, showSubject = false }: ExamRowProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3.5 transition-colors',
        paper.completed ? 'border-line bg-surface-2/45' : 'border-line bg-surface',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-subtle sm:flex">
          <FileText className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {showSubject ? (
              <Chip>
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: paper.subject.color }}
                  aria-hidden="true"
                />
                {paper.subject.name}
              </Chip>
            ) : null}
            <Chip>{paper.year}</Chip>
            <Chip>{sessionLabels[paper.session]}</Chip>
            <span className="flex items-center gap-1 text-[10px] text-subtle">
              <Clock3 className="h-3 w-3" aria-hidden="true" />
              {paper.durationMinutes} دقيقة
            </span>
          </div>
          <p
            className={cn(
              'mt-1.5 text-[13px] font-medium leading-relaxed',
              paper.completed ? 'text-muted' : 'text-ink',
            )}
          >
            {paper.title}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {paper.topics.slice(0, 3).map((topic) => (
              <span key={topic} className="text-[9.5px] text-subtle">
                {topic}
                {paper.topics.indexOf(topic) < Math.min(paper.topics.length, 3) - 1 ? ' ·' : ''}
              </span>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <CompletionToggle
            checked={paper.completed}
            onChange={() => onToggle(paper)}
            disabled={disabled}
            loading={pending}
            label={paper.completed ? `إلغاء إنجاز ${paper.title}` : `تعليم ${paper.title} كمنجز`}
          />
          <span className={cn('text-[9px]', paper.completed ? 'text-success' : 'text-subtle')}>
            {paper.completed ? 'منجز' : 'غير منجز'}
          </span>
          {paper.completed && paper.completedAt ? (
            <span className="text-[8.5px] text-subtle">{formatDate(paper.completedAt, 'short')}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
