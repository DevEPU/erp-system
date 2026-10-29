const fs = require('fs');
const file = 'src/app/(admin)/budgeting/master-budget/page.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  'const [statusFilter, setStatusFilter] = useState("all");',
  `const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");`
);

let filterTarget = `    const matchesDept =
      deptFilter === "all" || b.department_id.toString() === deptFilter;

    return matchesSearch && matchesDept;`;

let filterReplacement = `    const matchesDept =
      deptFilter === "all" || b.department_id.toString() === deptFilter;

    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "mandatory" && (b.is_mandatory === 1 || b.is_mandatory === true)) ||
      (typeFilter === "others" && (b.is_mandatory === 0 || b.is_mandatory === false || b.is_mandatory === null));

    const matchesMonth =
      monthFilter === "all" ||
      b.bulan?.toString() === monthFilter ||
      (b.periode_awal && (new Date(b.periode_awal).getMonth() + 1).toString() === monthFilter);

    return matchesSearch && matchesDept && matchesType && matchesMonth;`;

c = c.replace(filterTarget, filterReplacement);
c = c.replace(filterTarget.replace(/\n/g, '\r\n'), filterReplacement);

let uiTarget = `          <div className="flex items-center gap-2 px-2 border-l border-gray-100">
            <div className="w-40">
              <SearchableSelect
                label=""
                placeholder="All Status"
                value={statusFilter}
                onChange={(val) => setStatusFilter(val.toString())}
                options={[
                  { value: "all", label: "Semua Status" },
                  { value: "Approved", label: "Approved" },
                  { value: "Pending", label: "Pending" },
                  { value: "Rejected", label: "Rejected" },
                ]}
              />
            </div>
          </div>
        </div>`;

let uiReplacement = `          <div className="flex items-center gap-2 px-2 border-l border-gray-100">
            <div className="w-40">
              <SearchableSelect
                label=""
                placeholder="All Status"
                value={statusFilter}
                onChange={(val) => setStatusFilter(val.toString())}
                options={[
                  { value: "all", label: "Semua Status" },
                  { value: "Approved", label: "Approved" },
                  { value: "Pending", label: "Pending" },
                  { value: "Rejected", label: "Rejected" },
                ]}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 px-2 border-l border-gray-100">
            <div className="w-40">
              <SearchableSelect
                label=""
                placeholder="Semua Tipe"
                value={typeFilter}
                onChange={(val) => setTypeFilter(val.toString())}
                options={[
                  { value: "all", label: "Semua Tipe" },
                  { value: "mandatory", label: "Mandatory" },
                  { value: "others", label: "Others" },
                ]}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 px-2 border-l border-gray-100">
            <div className="w-40">
              <SearchableSelect
                label=""
                placeholder="Semua Bulan"
                value={monthFilter}
                onChange={(val) => setMonthFilter(val.toString())}
                options={[
                  { value: "all", label: "Semua Bulan" },
                  { value: "1", label: "Januari" },
                  { value: "2", label: "Februari" },
                  { value: "3", label: "Maret" },
                  { value: "4", label: "April" },
                  { value: "5", label: "Mei" },
                  { value: "6", label: "Juni" },
                  { value: "7", label: "Juli" },
                  { value: "8", label: "Agustus" },
                  { value: "9", label: "September" },
                  { value: "10", label: "Oktober" },
                  { value: "11", label: "November" },
                  { value: "12", label: "Desember" },
                ]}
              />
            </div>
          </div>
        </div>`;

c = c.replace(uiTarget, uiReplacement);
c = c.replace(uiTarget.replace(/\n/g, '\r\n'), uiReplacement);

fs.writeFileSync(file, c);
console.log('Modified file successfully');
