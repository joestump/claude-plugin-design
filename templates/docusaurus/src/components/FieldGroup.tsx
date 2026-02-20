import React, {ReactNode, ReactElement} from 'react';
import clsx from 'clsx';

interface FieldGroupProps {
  children: ReactNode;
  className?: string;
}

export default function FieldGroup({children, className}: FieldGroupProps): ReactElement {
  return (
    <div className={clsx('dd-field-group', className)}>
      {children}
    </div>
  );
}
