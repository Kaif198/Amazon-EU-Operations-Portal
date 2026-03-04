import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { TableRowSkeleton } from './SkeletonLoader.jsx';

/**
 * Amazon-style sortable, paginated data table.
 *
 * Props:
 *   columns   — array of { key, label, render?, sortable?, width?, align? }
 *   data      — array of row objects
 *   pageSize  — rows per page (default 15)
 *   loading   — show skeleton rows
 *   onRowClick — optional row click handler
 *   rowKey    — function to extract unique key from row (default uses index)
 */
export default function DataTable({
  columns = [],
  data = [],
  pageSize = 15,
  loading = false,
  onRowClick,
  rowKey = (row, i) => i,
  emptyMessage = 'No data available.'
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageData = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startRow = (safePage - 1) * pageSize + 1;
  const endRow = Math.min(safePage * pageSize, sorted.length);

  const SortIcon = ({ col }) => {
    if (!col.sortable) return null;
    if (sortKey !== col.key) return <ChevronsUpDown size={13} color="#999" style={{ marginLeft: 4 }} />;
    return sortDir === 'asc'
      ? <ChevronUp size={13} color="#FF9900" style={{ marginLeft: 4 }} />
      : <ChevronDown size={13} color="#FF9900" style={{ marginLeft: 4 }} />;
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="amazon-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                onClick={() => col.sortable && handleSort(col.key)}
                style={{
                  width: col.width || undefined,
                  textAlign: col.align || 'left',
                  cursor: col.sortable ? 'pointer' : 'default'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                  {col.label}
                  <SortIcon col={col} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: pageSize }).map((_, i) => (
                <TableRowSkeleton key={i} columns={columns.length} />
              ))
            : pageData.length === 0
              ? (
                <tr>
                  <td colSpan={columns.length} style={{ textAlign: 'center', color: '#999', padding: '32px' }}>
                    {emptyMessage}
                  </td>
                </tr>
              )
              : pageData.map((row, i) => (
                <tr
                  key={rowKey(row, i)}
                  onClick={() => onRowClick?.(row)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map(col => (
                    <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
          }
        </tbody>
      </table>

      {/* Pagination */}
      {!loading && sorted.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderTop: '1px solid #EEE',
          backgroundColor: '#FAFAFA',
          fontSize: '13px',
          color: '#565959'
        }}>
          <span>Showing {startRow}-{endRow} of {sorted.length} records</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{
                padding: '4px 10px',
                border: '1px solid #DDD',
                borderRadius: '4px',
                backgroundColor: '#FFF',
                cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                color: safePage === 1 ? '#CCC' : '#007185',
                fontSize: '13px'
              }}
            >
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = Math.max(1, Math.min(safePage - 2, totalPages - 4)) + i;
              return p <= totalPages ? (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    padding: '4px 10px',
                    border: '1px solid',
                    borderColor: p === safePage ? '#FF9900' : '#DDD',
                    borderRadius: '4px',
                    backgroundColor: p === safePage ? '#FFFBF0' : '#FFF',
                    color: p === safePage ? '#C7511F' : '#333',
                    fontWeight: p === safePage ? 700 : 400,
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  {p}
                </button>
              ) : null;
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{
                padding: '4px 10px',
                border: '1px solid #DDD',
                borderRadius: '4px',
                backgroundColor: '#FFF',
                cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                color: safePage === totalPages ? '#CCC' : '#007185',
                fontSize: '13px'
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
