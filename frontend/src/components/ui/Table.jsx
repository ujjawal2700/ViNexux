import React from 'react';
import Spinner from './Spinner';

export const Table = ({
  columns = [],
  data = [],
  isLoading = false,
  emptyMessage = 'No data available',
  className = '',
}) => {
  return (
    <div className={`w-full overflow-x-auto rounded-2xl border border-[#e5d1d4] bg-white relative shadow-xs ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10">
          <Spinner size="md" />
        </div>
      )}
      <table className="w-full text-left text-sm text-[#3d0a0d] border-collapse">
        <thead className="bg-[#f4e7ea] text-[11px] font-bold uppercase tracking-wider text-[#7c5c5f] border-b border-[#e5d1d4]">
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
        <tbody className="divide-y divide-[#e5d1d4] font-medium">
          {data.length > 0 ? (
            data.map((row, rowIdx) => (
              <tr key={row._id || row.id || rowIdx} className="hover:bg-[#f4e7ea]/40 transition-colors">
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
                <td colSpan={columns.length} className="px-6 py-12 text-center text-xs text-[#7c5c5f]">
                  {emptyMessage}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
