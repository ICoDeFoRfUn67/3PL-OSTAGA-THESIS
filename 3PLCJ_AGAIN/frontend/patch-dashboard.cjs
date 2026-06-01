const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'admin', 'AdminDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add import after Sidebar import
content = content.replace(
  "import { Sidebar } from '@/components/Sidebar';",
  "import { Sidebar } from '@/components/Sidebar';\r\nimport { MobileAdminDashboardView } from './MobileAdminDashboardView';"
);

// 2. Replace: `return (\r\n  <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">`
// with the mobile wrapper + desktop wrapper opening
const searchA = '  return (\r\n  <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">';
const replaceA = `  return (\r\n    <>\r\n      {/* --- MOBILE UI --- */}\r\n      <div className="block md:hidden">\r\n        <MobileAdminDashboardView \r\n           employee={employee}\r\n           employees={employees}\r\n           hubs={hubs}\r\n           allEmployees={allEmployees}\r\n           totalEmployees={totalEmployees}\r\n           statusData={statusData}\r\n           employmentTypeData={employmentTypeData}\r\n           hubEmployeeData={hubEmployeeData}\r\n           searchTerm={searchTerm}\r\n           setSearchTerm={setSearchTerm}\r\n           searchHubTerm={searchHubTerm}\r\n           setSearchHubTerm={setSearchHubTerm}\r\n           searchLocationTerm={searchLocationTerm}\r\n           setSearchLocationTerm={setSearchLocationTerm}\r\n           selectedEmployee={selectedEmployee}\r\n           setSelectedEmployee={setSelectedEmployee}\r\n           showEmployeeModal={showEmployeeModal}\r\n           setShowEmployeeModal={setShowEmployeeModal}\r\n        />\r\n      </div>\r\n\r\n      {/* --- DESKTOP UI --- */}\r\n      <div className="hidden md:block min-h-screen bg-gray-50 dark:bg-dark-bg">`;

if (!content.includes(searchA)) {
  console.error('ERROR: Could not find return statement. Dumping nearby chars...');
  const idx = content.indexOf('return (');
  if (idx !== -1) {
    const snippet = content.substring(idx, idx + 200).replace(/\r/g, '\\r').replace(/\n/g, '\\n');
    console.error('Found return at index', idx, ':', snippet);
  }
  process.exit(1);
}
content = content.replace(searchA, replaceA);

// 3. Replace the very last closing: </div>\r\n  </div>\r\n  );\r\n};
// We need to add one more </div> for the desktop wrapper
// Find last `);\r\n};` in the file
const closingMarker = ');\r\n};';
const lastClose = content.lastIndexOf(closingMarker);
if (lastClose === -1) {
  console.error('ERROR: Could not find closing marker');
  process.exit(1);
}

// Go backwards from lastClose to find what's before it
// We expect: `  </div>\r\n  );\r\n};`
// We want: `  </div>\r\n    </div>\r\n    </>\r\n  );\r\n};`
// Find the </div> just before the );
const beforeClose = content.lastIndexOf('</div>', lastClose);
// Insert </div>\r\n right after that </div>\r\n
const insertPoint = content.indexOf('\r\n', beforeClose) + 2;
content = content.substring(0, insertPoint) + '    </div>\r\n    </>\r\n' + content.substring(insertPoint);

// Now fix the `);\r\n};` — remove the extra spaces if needed  
// The result should end with: </div>\r\n    </div>\r\n    </>\r\n  );\r\n};

fs.writeFileSync(filePath, content, 'utf-8');
console.log('SUCCESS: AdminDashboard.tsx patched successfully.');
