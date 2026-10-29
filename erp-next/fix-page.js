const fs = require("fs");
const file = "src/app/(admin)/budgeting/master-budget/page.tsx";
let c = fs.readFileSync(file, "utf8");

c = c.replace(
  '<th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">\r\n                  Grand Total\r\n                </th>',
  `<th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                  Approved Total
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                  Used
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                  Remaining
                </th>`,
);

// If the first replace didn't work due to \n differences:
c = c.replace(
  '<th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">\n                  Grand Total\n                </th>',
  `<th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                  Approved Total
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                  Used
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                  Remaining
                </th>`,
);

c = c.replace("colSpan={7}", "colSpan={9}");
c = c.replace("length: 7", "length: 9");

const targetRowRaw = `<td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">
                          Rp {parseFloat(budget.grandtotal).toLocaleString()}
                        </span>
                        {parseFloat(budget.total_percentage || 0) > 0 && (
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">
                            {budget.total_percentage}% OF SALES TARGET
                          </span>
                        )}
                      </div>
                    </td>`;

const replacementRowRaw = `<td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-gray-900">
                          Rp {parseFloat(budget.grandtotal || 0).toLocaleString("id-ID")}
                        </span>
                        {parseFloat(budget.total_percentage || 0) > 0 && (
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">
                            {budget.total_percentage}% OF SALES TARGET
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-orange-600">
                      Rp {parseFloat(budget.used_amount || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-emerald-600">
                      Rp {(parseFloat(budget.grandtotal || 0) - parseFloat(budget.used_amount || 0)).toLocaleString("id-ID")}
                    </td>`;

c = c.replace(targetRowRaw, replacementRowRaw);
c = c.replace(targetRowRaw.replace(/\n/g, "\r\n"), replacementRowRaw);

fs.writeFileSync(file, c);
console.log("Modified file");
