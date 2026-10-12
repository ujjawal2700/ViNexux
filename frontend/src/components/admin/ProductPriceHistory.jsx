import React, { useState } from 'react';
import { History } from 'lucide-react';
import Table from '../ui/Table';
import Button from '../ui/Button';

const ProductPriceHistory = ({ entries = [] }) => {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = [...entries].reverse().slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const price = (value) => `₹${Number(value).toLocaleString('en-IN')}`;

  return <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-bold text-gray-900 flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Price History</h3>
      <span className="text-xs text-gray-500">{entries.length} recorded changes · Times in IST</span>
    </div>
    {entries.length === 0 ? <p className="text-sm text-gray-500">No price changes recorded yet. Saved changes to standard and dealer prices will appear here.</p> : <>
      <Table className="[&_th]:px-3 [&_td]:px-3 [&_td]:py-2">
        <Table.Header><Table.Row>
          <Table.Head>When</Table.Head><Table.Head>Price Type</Table.Head><Table.Head>Previous Price</Table.Head><Table.Head>New Price</Table.Head><Table.Head>Changed By</Table.Head>
        </Table.Row></Table.Header>
        <Table.Body>{visible.map((entry, index) => <Table.Row key={`${entry.changedAt}-${entry.priceType}-${index}`}>
          <Table.Cell className="whitespace-nowrap">{new Date(entry.changedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}</Table.Cell>
          <Table.Cell>{entry.priceType === 'standard' ? 'Standard' : 'Dealer'}</Table.Cell>
          <Table.Cell>{price(entry.previousPrice)}</Table.Cell>
          <Table.Cell className="font-semibold">{price(entry.newPrice)}</Table.Cell>
          <Table.Cell>{entry.changedByName || 'System'}</Table.Cell>
        </Table.Row>)}</Table.Body>
      </Table>
      {totalPages > 1 && <div className="flex items-center justify-end gap-2 text-xs">
        <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</Button>
        <span>Page {currentPage} of {totalPages}</span>
        <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Next</Button>
      </div>}
    </>}
  </section>;
};

export default ProductPriceHistory;
