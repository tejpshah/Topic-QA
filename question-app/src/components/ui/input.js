import React from 'react';

export const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input
    className={`border rounded p-2 w-full ${className}`}
    ref={ref}
    {...props}
  />
));