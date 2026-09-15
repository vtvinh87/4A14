import type { ChangeEvent } from 'react';

export type PinAutocomplete = 'current-password' | 'new-password' | 'one-time-code';

export function sanitizePin(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, 6);
}

type PinFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  autoComplete?: PinAutocomplete;
};

export function PinField({ id, label, value, onChange, autoFocus = false, autoComplete = 'current-password' }: PinFieldProps) {
  const digits = sanitizePin(value);
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => onChange(sanitizePin(event.currentTarget.value));

  return (
    <label className="auth-field pin-field" htmlFor={id}>
      <span>{label}</span>
      <span className="pin-field-control">
        <span className="pin-cells" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <span className={`pin-cell${index < digits.length ? ' is-filled' : ''}`} data-pin-cell={index + 1} key={index}>
              {index < digits.length ? '•' : ''}
            </span>
          ))}
        </span>
        <input
          id={id}
          name={id}
          className="pin-field-input"
          type="password"
          inputMode="numeric"
          autoComplete={autoComplete}
          maxLength={6}
          pattern="[0-9]*"
          value={digits}
          onChange={handleChange}
          autoFocus={autoFocus}
        />
      </span>
    </label>
  );
}
