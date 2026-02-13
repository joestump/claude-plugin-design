import React, {ReactNode, ReactElement} from 'react';
import clsx from 'clsx';

interface FieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export default function Field({label, children, className}: FieldProps): ReactElement {
  return (
    <div className={clsx('field', className)}>
      <span className="field-label">{label}:</span>
      <span className="field-value">{children}</span>
    </div>
  );
}
