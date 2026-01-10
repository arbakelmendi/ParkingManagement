import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className }) => {
  return (
    <div className={cn('card-parking p-6 space-y-4', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-5 w-32 skeleton" />
          <div className="h-4 w-48 skeleton" />
        </div>
        <div className="h-8 w-8 skeleton rounded-lg" />
      </div>
      <div className="flex gap-4">
        <div className="h-4 w-20 skeleton" />
        <div className="h-4 w-24 skeleton" />
      </div>
      <div className="flex gap-2 pt-2">
        <div className="h-9 w-24 skeleton rounded-lg" />
        <div className="h-9 w-20 skeleton rounded-lg" />
      </div>
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="space-y-4">
      <div className="flex gap-4 pb-4 border-b">
        <div className="h-4 w-24 skeleton" />
        <div className="h-4 w-32 skeleton" />
        <div className="h-4 w-28 skeleton" />
        <div className="h-4 w-20 skeleton" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3">
          <div className="h-4 w-24 skeleton" />
          <div className="h-4 w-32 skeleton" />
          <div className="h-4 w-28 skeleton" />
          <div className="h-4 w-20 skeleton" />
          <div className="h-8 w-16 skeleton rounded-lg ml-auto" />
        </div>
      ))}
    </div>
  );
};

export const SkeletonStats: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card-parking p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 skeleton" />
            <div className="h-10 w-10 skeleton rounded-lg" />
          </div>
          <div className="h-8 w-16 skeleton" />
          <div className="h-3 w-20 skeleton" />
        </div>
      ))}
    </div>
  );
};
