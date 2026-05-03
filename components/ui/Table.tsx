import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Inbox, Loader2 } from 'lucide-react'

export interface Column<T> {
  key: string
  label: string
  render?: (item: T) => React.ReactNode
  className?: string
  headerClass?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  page?: number
  totalPages?: number
  total?: number
  onPageChange?: (page: number) => void
  rowKey?: (item: T) => string | number
  selectable?: boolean
  selectedKeys?: (string | number)[]
  onSelectionChange?: (keys: (string | number)[]) => void
}

export default function Table<T>({
  columns, data, loading, emptyMessage = 'Belum ada data',
  emptyIcon, page = 1, totalPages = 1, total, onPageChange, rowKey,
  selectable, selectedKeys, onSelectionChange
}: TableProps<T>) {
  const getKey = (item: T, i: number) => rowKey ? rowKey(item) : i

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {selectable && (
                <th className="th w-10 text-center px-4">
                  <input type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    checked={data.length > 0 && selectedKeys?.length === data.length}
                    onChange={(e) => {
                      if (onSelectionChange) {
                        onSelectionChange(e.target.checked ? data.map((item, i) => getKey(item, i)) : [])
                      }
                    }}
                  />
                </th>
              )}
              {columns.map(col => (
                <th key={col.key} className={cn('th', col.headerClass)}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {selectable && <td className="td w-10"></td>}
                  {columns.map(col => (
                    <td key={col.key} className="td">
                      <div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)}>
                  <div className="empty-state">
                    {emptyIcon ?? <Inbox className="w-12 h-12 opacity-30" />}
                    <span className="text-sm font-medium">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, i) => {
                const key = getKey(item, i)
                return (
                  <tr key={key} className={cn('tr', selectedKeys?.includes(key) && 'bg-indigo-50/50')}>
                    {selectable && (
                      <td className="td w-10 text-center px-4" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          checked={selectedKeys?.includes(key) || false}
                          onChange={(e) => {
                            if (onSelectionChange && selectedKeys) {
                              const checked = e.target.checked
                              onSelectionChange(
                                checked ? [...selectedKeys, key] : selectedKeys.filter(k => k !== key)
                              )
                            }
                          }}
                        />
                      </td>
                    )}
                    {columns.map(col => (
                      <td key={col.key} className={cn('td', col.className)}>
                        {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(totalPages > 1 || total !== undefined) && onPageChange && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
          <span className="text-xs text-slate-500">
            {total !== undefined ? `${total} data` : ''} — Halaman {page} dari {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
              className="btn-icon disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let p: number
              if (totalPages <= 7) p = i + 1
              else if (page <= 4) p = i + 1
              else if (page >= totalPages - 3) p = totalPages - 6 + i
              else p = page - 3 + i
              return (
                <button key={p} onClick={() => onPageChange(p)}
                  className={cn(
                    'w-7 h-7 text-xs rounded-lg font-medium transition-colors',
                    p === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                  )}>
                  {p}
                </button>
              )
            })}
            <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
              className="btn-icon disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
