import React, {ReactNode, ReactElement} from 'react';
import clsx from 'clsx';

interface GherkinScenarioProps {
  title: string;
  tags?: string[];
  children: ReactNode;
  className?: string;
}

export default function GherkinScenario({title, tags = [], children, className}: GherkinScenarioProps): ReactElement {
  return (
    <div className={clsx('gherkin-scenario', className)}>
      <div className="gherkin-scenario-header">
        <span className="gherkin-scenario-title">{title}</span>
        {tags.length > 0 && (
          <div className="gherkin-scenario-tags">
            {tags.map((tag, idx) => (
              <span key={idx} className="gherkin-tag">@{tag}</span>
            ))}
          </div>
        )}
      </div>
      <div className="gherkin-scenario-body">
        {children}
      </div>
    </div>
  );
}
