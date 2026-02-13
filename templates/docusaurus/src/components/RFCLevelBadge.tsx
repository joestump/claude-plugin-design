import React, {ReactElement} from 'react';
import clsx from 'clsx';

interface RFCLevelBadgeProps {
  level: string;
  className?: string;
}

const levelConfig: Record<string, { severity: string }> = {
  'MUST': { severity: 'critical' },
  'MUST NOT': { severity: 'critical' },
  'SHALL': { severity: 'critical' },
  'SHALL NOT': { severity: 'critical' },
  'REQUIRED': { severity: 'critical' },
  'SHOULD': { severity: 'high' },
  'SHOULD NOT': { severity: 'high' },
  'RECOMMENDED': { severity: 'high' },
  'MAY': { severity: 'optional' },
  'OPTIONAL': { severity: 'optional' },
};

export default function RFCLevelBadge({level, className}: RFCLevelBadgeProps): ReactElement {
  const normalized = level.toUpperCase();
  const config = levelConfig[normalized] || { severity: 'unknown' };
  return (
    <span className={clsx('rfc-level-badge', config.severity, className)}>
      {level.toUpperCase()}
    </span>
  );
}
