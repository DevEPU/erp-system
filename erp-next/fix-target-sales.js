const fs = require('fs');
const file = 'src/app/(admin)/budgeting/target-sales/page.tsx';
let c = fs.readFileSync(file, 'utf8');

const targetMethod = `  return (`;
const replacementMethod = `  const getApprovalStatusText = (t: any) => {
    const request = t.approval_request || t.approvalRequest;
    if (!request || !request.logs) return null;
    
    // Find the next pending log
    const pendingLogs = request.logs
      .filter((l: any) => l.action?.toLowerCase() === "pending")
      .sort((a: any, b: any) => a.level - b.level);
      
    if (pendingLogs.length > 0) {
      const nextApprover = pendingLogs[0];
      return \`Menunggu approval dari: \${nextApprover.approver_name} (Level \${nextApprover.level})\`;
    }
    return null;
  };

  return (`;

if (!c.includes('const getApprovalStatusText = (t: any) => {')) {
  c = c.replace(targetMethod, replacementMethod);
}

const targetUI = `<div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                <span
                  className={\`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest \${getStatusStyle(target.status)}\`}
                >
                  {target.status}
                </span>
                <span className="text-[10px] font-bold text-gray-300 uppercase italic">
                  Ref: {target.reference}
                </span>
              </div>`;

const targetUICRLF = targetUI.replace(/\n/g, '\r\n');

const replacementUI = `<div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                  <span
                    className={\`w-fit text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest \${getStatusStyle(target.status)}\`}
                  >
                    {target.status}
                  </span>
                  {target.status?.toLowerCase() === "pending" && (
                    <span className="text-[10px] text-gray-500 italic">
                      {getApprovalStatusText(target)}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-gray-300 uppercase italic">
                  Ref: {target.reference}
                </span>
              </div>`;

if (c.includes(targetUI)) {
  c = c.replace(targetUI, replacementUI);
  console.log('Replaced UI LF');
} else if (c.includes(targetUICRLF)) {
  c = c.replace(targetUICRLF, replacementUI);
  console.log('Replaced UI CRLF');
}

fs.writeFileSync(file, c);
console.log('Successfully updated target sales page logs.');
