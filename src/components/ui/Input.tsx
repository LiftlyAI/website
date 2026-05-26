'use client';
import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(
  ({ label, hint, error, className, ...rest }, ref) => (
    <label className="block">
      {label && (
        <span className="block stencil-heading text-xs text-chalk-dim mb-1.5">{label}</span>
      )}
      <input
        ref={ref}
        className={cn('input-iron', error && 'border-rpe-max', className)}
        {...rest}
      />
      {hint && !error && <span className="block text-xs text-chalk-mute mt-1 font-mono">{hint}</span>}
      {error && <span className="block text-xs text-rpe-max mt-1 font-mono">{error}</span>}
    </label>
  ),
);
Input.displayName = 'Input';

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & FieldProps & { options: { value: string; label: string }[] }
>(({ label, hint, error, options, className, ...rest }, ref) => (
  <label className="block">
    {label && <span className="block stencil-heading text-xs text-chalk-dim mb-1.5">{label}</span>}
    <select
      ref={ref}
      className={cn('input-iron appearance-none cursor-pointer', error && 'border-rpe-max', className)}
      {...rest}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-iron-900 text-chalk">
          {o.label}
        </option>
      ))}
    </select>
    {hint && !error && <span className="block text-xs text-chalk-mute mt-1 font-mono">{hint}</span>}
    {error && <span className="block text-xs text-rpe-max mt-1 font-mono">{error}</span>}
  </label>
));
Select.displayName = 'Select';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps
>(({ label, hint, error, className, ...rest }, ref) => (
  <label className="block">
    {label && <span className="block stencil-heading text-xs text-chalk-dim mb-1.5">{label}</span>}
    <textarea
      ref={ref}
      rows={3}
      className={cn('input-iron resize-y', error && 'border-rpe-max', className)}
      {...rest}
    />
    {hint && !error && <span className="block text-xs text-chalk-mute mt-1 font-mono">{hint}</span>}
    {error && <span className="block text-xs text-rpe-max mt-1 font-mono">{error}</span>}
  </label>
));
Textarea.displayName = 'Textarea';
