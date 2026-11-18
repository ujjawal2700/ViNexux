import Table from '../ui/Table';

// Keep account and verification records readable without horizontal scrolling.
export default function AdminDirectoryTable({ children, className = '' }) {
  return <Table scrollable={false} className={`[&_table]:block [&_table]:table-fixed xl:[&_table]:table [&_thead]:hidden xl:[&_thead]:table-header-group [&_tbody]:block xl:[&_tbody]:table-row-group [&_tbody_tr]:grid [&_tbody_tr]:grid-cols-1 md:[&_tbody_tr]:grid-cols-2 xl:[&_tbody_tr]:table-row [&_td]:block [&_td]:min-w-0 [&_td]:break-words [&_td]:px-3 [&_td]:py-3 [&_td]:align-top xl:[&_td]:table-cell [&_th]:px-3 ${className}`}>{children}</Table>;
}
