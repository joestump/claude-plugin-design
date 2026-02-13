import React, {ReactNode, ReactElement} from 'react';
import clsx from 'clsx';
import RFCLevelBadge from './RFCLevelBadge';

interface RequirementBoxProps {
  id: string;
  rfcLevel?: string;
  children: ReactNode;
  className?: string;
}

export default function RequirementBox({id, rfcLevel, children, className}: RequirementBoxProps): ReactElement {
  const anchorId = id.toLowerCase();
  return (
    <div className={clsx('requirement-box', className)} id={anchorId}>
      <div className="requirement-header">
        <span className="requirement-id">
          <a href={`#${anchorId}`}>{id}</a>
        </span>
        {rfcLevel && (
          <div className="requirement-meta">
            <RFCLevelBadge level={rfcLevel} />
          </div>
        )}
      </div>
      <div className="requirement-body">{children}</div>
    </div>
  );
}
