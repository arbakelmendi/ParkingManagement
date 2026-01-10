import React from 'react';
import { motion } from 'framer-motion';
import { ParkingCircle, Search, Calendar, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'parking' | 'search' | 'reservations';
}

const variantIcons = {
  default: FolderOpen,
  parking: ParkingCircle,
  search: Search,
  reservations: Calendar,
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
  variant = 'default',
}) => {
  const IconComponent = variantIcons[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
        {icon || <IconComponent className="w-8 h-8 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      {action}
    </motion.div>
  );
};

export default EmptyState;
