import React, { useState } from 'react';

const normalize = value => String(value ?? '').replace(/^(-?)0+(?=\d)/, '$1');

// Keep incomplete edits (blank, 0., fractional values) visible even when a
// form stores Number(value) immediately. On blur, the form's validated value
// takes over again, preserving its existing defaults and min/max rules.
const NumberInput = React.forwardRef(({
  value,
  defaultValue = '',
  onChange,
  onFocus,
  onBlur,
  type: _type,
  ...props
}, ref) => {
  const [editingValue, setEditingValue] = useState(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const committedValue = value === undefined ? uncontrolledValue : value;

  return (
    <input
      {...props}
      ref={ref}
      type="number"
      value={editingValue ?? normalize(committedValue)}
      onFocus={event => {
        const current = event.currentTarget.value;
        setEditingValue(current !== '' && Number(current) === 0 ? '' : current);
        onFocus?.(event);
      }}
      onChange={event => {
        const next = normalize(event.currentTarget.value);
        // Consumers receive the same cleaned value that is shown on screen.
        if (next !== event.currentTarget.value) event.currentTarget.value = next;
        setEditingValue(next);
        if (value === undefined) setUncontrolledValue(next);
        onChange?.(event);
      }}
      onBlur={event => {
        setEditingValue(null);
        onBlur?.(event);
      }}
    />
  );
});

NumberInput.displayName = 'NumberInput';
export default NumberInput;
