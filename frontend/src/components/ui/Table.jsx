import React from 'react';
import Spinner from './Spinner';

const wrapperClass = (className = '') =>
  `w-full overflow-x-auto rounded-2xl border border-border bg-card relative shadow-xs ${className}`;

const theadClass = 'bg-muted text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border';
const tbodyClass = 'divide-y divide-border font-medium';
const rowClass = 'hover:bg-muted/40 transition-colors';
const headCellClass = (className = '') => `px-6 py-3.5 text-left ${className}`;
const bodyCellClass = (className = '') => `px-6 py-4 text-xs text-left ${className}`;

/**
 * Table
 *
 * Supports two usage patterns:
 *  1. Compound components (used across the admin panel):
 *       <Table>
 *         <Table.Header>
 *           <Table.Row><Table.Head>Name</Table.Head></Table.Row>
 *         </Table.Header>
 *         <Table.Body>
 *           <Table.Row><Table.Cell>...</Table.Cell></Table.Row>
 *         </Table.Body>
 *       </Table>
 *  2. Flat props (columns/data driven), for simpler call sites:
 *       <Table columns={columns} data={rows} isLoading={loading} />
 */
export const Table = ({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No data available',
  className = '',
  children,
}) => {
  // Flat props API
  if (columns) {
    const rows = data || [];
    return (
      <div className={wrapperClass(className)}>
        {isLoading && (
          <div className="absolute inset-0 bg-card/70 backdrop-blur-xs flex items-center justify-center z-10">
            <Spinner size="md" />
          </div>
        )}
        <table className="w-full text-left text-sm text-foreground border-collapse">
          <thead className={theadClass}>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  className={`px-6 py-3.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {rows.length > 0 ? (
              rows.map((row, rowIdx) => (
                <tr key={row._id || row.id || rowIdx} className={rowClass}>
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      className={`px-6 py-4 text-xs ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                    >
                      {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              !isLoading && (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-xs text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // Compound components API
  return (
    <div className={wrapperClass(className)}>
      {isLoading && (
        <div className="absolute inset-0 bg-card/70 backdrop-blur-xs flex items-center justify-center z-10">
          <Spinner size="md" />
        </div>
      )}
      <table className="w-full text-left text-sm text-foreground border-collapse">
        {children}
      </table>
    </div>
  );
};

const TableHeader = ({ children, className = '' }) => (
  <thead className={`${theadClass} ${className}`}>{children}</thead>
);

const TableBody = ({ children, className = '' }) => (
  <tbody className={`${tbodyClass} ${className}`}>{children}</tbody>
);

const TableRow = ({ children, className = '', onClick }) => (
  <tr className={`${rowClass} ${className}`} onClick={onClick}>
    {children}
  </tr>
);

const TableHead = ({ children, className = '' }) => (
  <th className={headCellClass(className)}>{children}</th>
);

const TableCell = ({ children, className = '', colSpan, onClick }) => (
  <td className={bodyCellClass(className)} colSpan={colSpan} onClick={onClick}>
    {children}
  </td>
);

Table.Header = TableHeader;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Head = TableHead;
Table.Cell = TableCell;

export default Table;
