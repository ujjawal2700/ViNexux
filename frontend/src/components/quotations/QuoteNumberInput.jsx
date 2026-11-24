import { useState } from 'react';

// Keep the editing text separate from its numeric value so clearing a field,
// replacing zero, and entering decimal prices never fight a controlled input.
export default function QuoteNumberInput({ value, onChange, min = 0, max, step = '1', emptyZero = false, ...props }) {
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const decimal = Number(step) < 1;
  const validate = (element, text) => {
    const number = Number(text);
    element.setCustomValidity(text !== '' && (number < Number(min) || (max !== undefined && number > Number(max))) ? `Enter a number from ${min}${max !== undefined ? ` to ${max}` : ' or higher'}.` : '');
  };
  return <input {...props} type="text" inputMode={decimal ? 'decimal' : 'numeric'} pattern={decimal ? '[0-9]+([.][0-9]{1,2})?' : '[0-9]+'} placeholder={props.placeholder ?? '0'} value={focused ? draft : emptyZero && Number(value) === 0 ? '' : String(value ?? '')}
    onFocus={event => { const text = Number(value) === 0 ? '' : String(value ?? ''); setDraft(text); setFocused(true); event.target.select(); }}
    onChange={event => { let text = event.target.value; if (!(decimal ? /^\d*(?:\.\d{0,2})?$/ : /^\d*$/).test(text)) return; text = text.replace(/^0+(?=\d)/, ''); setDraft(text); validate(event.target, text); onChange(Number(text || 0)); }}
    onBlur={event => { setFocused(false); validate(event.target, String(value ?? '')); }} />;
}
