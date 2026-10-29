const fs = require('fs');
const file = 'src/app/(admin)/budgeting/master-budget/page.tsx';
let c = fs.readFileSync(file, 'utf8');

const target = `                ))
              )}
            </tbody>
          </table>`;

const replacement = `                ))
              )}
              {filteredBudgets.length > 0 && (
                <tr className="bg-emerald-50/50 font-bold border-t-2 border-emerald-100/50">
                  <td
                    colSpan={3}
                    className="px-6 py-4 text-right text-emerald-900 uppercase tracking-widest text-xs"
                  >
                    Total Keseluruhan
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    Rp {filteredBudgets.reduce((acc, curr) => acc + parseFloat(curr.grandtotal || 0), 0).toLocaleString("id-ID")}
                  </td>
                  <td className="px-6 py-4 text-right text-orange-600">
                    Rp {filteredBudgets.reduce((acc, curr) => acc + parseFloat(curr.used_amount || 0), 0).toLocaleString("id-ID")}
                  </td>
                  <td className="px-6 py-4 text-right text-emerald-600">
                    Rp {filteredBudgets.reduce((acc, curr) => acc + (parseFloat(curr.grandtotal || 0) - parseFloat(curr.used_amount || 0)), 0).toLocaleString("id-ID")}
                  </td>
                  <td colSpan={3} className="px-6 py-4"></td>
                </tr>
              )}
            </tbody>
          </table>`;

if (c.includes(target)) {
  c = c.replace(target, replacement);
  fs.writeFileSync(file, c);
  console.log('Successfully injected total row.');
} else {
  // Try with \r\n line endings
  const targetCRLF = target.replace(/\n/g, '\r\n');
  if (c.includes(targetCRLF)) {
    c = c.replace(targetCRLF, replacement);
    fs.writeFileSync(file, c);
    console.log('Successfully injected total row. (CRLF)');
  } else {
    console.log('Target string not found.');
  }
}
