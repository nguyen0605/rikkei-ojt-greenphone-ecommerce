import React from 'react';
import { Layers, Sparkles } from 'lucide-react';
import type { ComparedPhoneDTO, SpecGroupDTO } from '@/types/api';

interface CompareSpecTableProps {
  phones: ComparedPhoneDTO[];
  specGroups: SpecGroupDTO[];
  showDifferencesOnly: boolean;
}

export const CompareSpecTable: React.FC<CompareSpecTableProps> = ({
  phones,
  specGroups,
  showDifferencesOnly,
}) => {
  if (phones.length === 0 || specGroups.length === 0) {
    return null;
  }

  const phone1 = phones[0];
  const phone2 = phones[1];

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm" data-testid="compare-spec-table">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-1/3 md:w-1/4" />
            <col className="w-1/3 md:w-[37.5%]" />
            <col className="w-1/3 md:w-[37.5%]" />
          </colgroup>

          {/* Table Header with Phone Names */}
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80">
              <th className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                Thông số kỹ thuật
              </th>
              <th className="py-3.5 px-4 font-semibold text-emerald-700 dark:text-emerald-400">
                {phone1.name}
              </th>
              {phone2 && (
                <th className="py-3.5 px-4 font-semibold text-blue-700 dark:text-blue-400">
                  {phone2.name}
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {specGroups.map((group) => {
              const visibleItems = showDifferencesOnly
                ? group.items.filter((item) => item.isDifferent || (item as any).different)
                : group.items;

              if (visibleItems.length === 0 && showDifferencesOnly) {
                return null;
              }

              return (
                <React.Fragment key={group.groupKey}>
                  {/* Category Group Header Row */}
                  <tr className="bg-slate-100/90 dark:bg-slate-800/95 border-t border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-slate-100">
                    <td colSpan={phone2 ? 3 : 2} className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="uppercase text-xs tracking-wider font-bold">
                          {group.groupName}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Specification Detail Rows */}
                  {visibleItems.map((item) => {
                    const isDiff = item.isDifferent || (item as any).different || false;
                    const val1 = item.values[phone1.id] || '-';
                    const val2 = phone2 ? item.values[phone2.id] || '-' : '-';

                    return (
                      <tr
                        key={item.key}
                        data-spec-key={item.key}
                        className={`border-b border-slate-100 dark:border-slate-800/60 transition-colors ${
                          isDiff
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/40 dark:hover:bg-amber-900/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Label column */}
                        <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300 align-top">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{item.label}</span>
                            {isDiff && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">
                                <Sparkles className="w-2.5 h-2.5" />
                                Khác biệt
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Phone 1 column */}
                        <td className="py-3 px-4 text-slate-800 dark:text-slate-200 align-top break-words leading-relaxed font-normal">
                          {val1}
                        </td>

                        {/* Phone 2 column */}
                        {phone2 && (
                          <td className="py-3 px-4 text-slate-800 dark:text-slate-200 align-top break-words leading-relaxed font-normal">
                            {val2}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {showDifferencesOnly &&
        specGroups.every((g) => g.items.filter((i) => i.isDifferent || (i as any).different).length === 0) && (
          <div className="p-8 text-center text-slate-500 text-sm">
            <p>Hai sản phẩm này không có sự khác biệt nào trong các danh mục thông số hiện tại.</p>
          </div>
        )}
    </div>
  );
};

export default CompareSpecTable;
