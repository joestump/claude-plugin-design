import React from 'react';
import clsx from 'clsx';

interface DomainBadgeProps {
  domain: string;
  className?: string;
}

export default function DomainBadge({domain, className}: DomainBadgeProps): JSX.Element {
  return (
    <span className={clsx('domain-badge', className)}>
      \ud83d\udce6 {domain}
    </span>
  );
}
