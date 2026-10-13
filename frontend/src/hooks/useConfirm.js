import { useContext } from 'react';
import { ConfirmationContext } from '../context/ConfirmationContext';
export default function useConfirm() {
  const confirm = useContext(ConfirmationContext);
  if (!confirm) throw new Error('useConfirm requires ConfirmationProvider');
  return confirm;
}
