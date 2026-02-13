import React from 'react';

interface DateBadgeProps {
  date: string;
  className?: string;
}

export default function DateBadge({date, className}: DateBadgeProps): JSX.Element {
  return (
    <span className={`date-badge ${className || ''}`}>
      \ud83d\udcc5 {date}
    </span>
  );
}
