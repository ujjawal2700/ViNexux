import { useNavigate } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import Button from '../ui/Button';
import useConfirm from '../../hooks/useConfirm';
import { sendToBillingConfirmation } from '../../lib/billingConfirmations';

export default function SendToBillingButton({ order, className = '' }) {
  const confirm = useConfirm(), navigate = useNavigate();
  const send = async () => {
    if (await confirm(sendToBillingConfirmation(order))) navigate(`/admin/pos?order=${order._id}`);
  };
  return <Button type="button" variant="outline" size="sm" className={className} onClick={send}><Receipt className="mr-1.5 h-4 w-4" />Send to billing</Button>;
}
