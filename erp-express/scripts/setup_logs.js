const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('Connected to database to run logs migration and seeding...');

  try {
    // 1. Create activity_logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`activity_logs\` (
        \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        \`user_name\` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
        \`tgl\` datetime NOT NULL,
        \`document_type\` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
        \`action_type\` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
        \`action_detail\` text COLLATE utf8mb4_unicode_ci,
        \`ip_address\` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
        \`whid\` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`nama_device\` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`created_at\` timestamp NULL DEFAULT NULL,
        \`updated_at\` timestamp NULL DEFAULT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table activity_logs is ready.');

    // 2. Create error_logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`error_logs\` (
        \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        \`tgl\` datetime NOT NULL,
        \`user_name\` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
        \`role_name\` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
        \`method\` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
        \`url\` text COLLATE utf8mb4_unicode_ci NOT NULL,
        \`error_type_name\` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
        \`payload\` longtext COLLATE utf8mb4_unicode_ci,
        \`exception\` longtext COLLATE utf8mb4_unicode_ci,
        \`data_source_type\` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`hit_url_date\` datetime DEFAULT NULL,
        \`response_code\` int(11) DEFAULT NULL,
        \`response_message\` text COLLATE utf8mb4_unicode_ci,
        \`created_at\` timestamp NULL DEFAULT NULL,
        \`updated_at\` timestamp NULL DEFAULT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table error_logs is ready.');

    // 3. Register permissions
    const permissions = ['access_activity_logs', 'access_error_logs'];
    for (const name of permissions) {
      const [existing] = await connection.execute('SELECT id FROM permissions WHERE name = ?', [name]);
      if (existing.length === 0) {
        const [res] = await connection.execute(
          'INSERT INTO permissions (name, guard_name, created_at, updated_at) VALUES (?, "web", NOW(), NOW())',
          [name]
        );
        const permId = res.insertId;
        // Bind to Admin (1) and Super Admin (2)
        await connection.execute('INSERT IGNORE INTO role_has_permissions (permission_id, role_id) VALUES (?, 1)', [permId]);
        await connection.execute('INSERT IGNORE INTO role_has_permissions (permission_id, role_id) VALUES (?, 2)', [permId]);
        console.log(`Registered permission: ${name} (ID: ${permId})`);
      } else {
        const permId = existing[0].id;
        await connection.execute('INSERT IGNORE INTO role_has_permissions (permission_id, role_id) VALUES (?, 1)', [permId]);
        await connection.execute('INSERT IGNORE INTO role_has_permissions (permission_id, role_id) VALUES (?, 2)', [permId]);
        console.log(`Permission ${name} already existed, verified Admin/Super Admin binding.`);
      }
    }

    // 4. Seed activity_logs table
    const [actCount] = await connection.execute('SELECT COUNT(*) as count FROM activity_logs');
    if (actCount[0].count === 0) {
      const actLogs = [
        ['it staff', '2026-06-26 10:04:09', 'Delivery Order', 'Delete', '13704/EPU/SJ.WHS/VI/26', '172.16.16.127', 'WHFG', 'DESKTOP-ITSTAFF'],
        ['it staff', '2026-06-26 10:03:51', 'Login', 'Login', '', '172.16.16.127', '', 'DESKTOP-ITSTAFF'],
        ['it staff', '2026-06-25 08:12:40', 'Inventory', 'Edit', 'EPCM-CMOLDRLSE', '172.16.16.127', 'WHFG', 'DESKTOP-ITSTAFF'],
        ['it staff', '2026-06-25 08:12:32', 'Inventory', 'View', 'EPCM-CMOLDRLSE', '172.16.16.127', 'WHFG', 'DESKTOP-ITSTAFF'],
        ['it staff', '2026-06-25 08:07:22', 'Inventory', 'Edit', 'EPCM-CMOLDRLSE', '172.16.16.127', 'WHFG', 'DESKTOP-ITSTAFF'],
        ['it staff', '2026-06-25 08:07:10', 'Inventory', 'View', 'EPCM-CMOLDRLSE', '172.16.16.127', 'WHFG', 'DESKTOP-ITSTAFF'],
        ['it staff', '2026-06-25 08:01:09', 'Inventory', 'New', 'EPCM-CMOLDRLSE', '172.16.16.127', 'WHFG', 'DESKTOP-ITSTAFF'],
        ['it staff', '2026-06-25 07:59:39', 'Login', 'Login', '', '172.16.16.127', '', 'DESKTOP-ITSTAFF'],
        ['it staff', '2026-06-24 09:12:23', 'Inventory', 'Edit', 'Kode Item EPPP-PPGF30WLN diubah Menjadi EPNY-MPA6GF30W', '172.16.16.127', 'WHFG', 'DESKTOP-ITSTAFF'],
        ['it staff', '2026-06-24 09:12:07', 'Inventory', 'View', 'EPPP-PPGF30WLN', '172.16.16.127', 'WHFG', 'DESKTOP-ITSTAFF'],
        ['it staff', '2026-06-24 09:11:17', 'Inventory', 'Edit', 'Kode Item EPRB-KRBPKGK2SA-02 diubah Menjadi EPRB-KRPKGK2SM', '172.16.16.127', 'WHFG', 'DESKTOP-ITSTAFF']
      ];

      for (const row of actLogs) {
        await connection.execute(
          'INSERT INTO activity_logs (user_name, tgl, document_type, action_type, action_detail, ip_address, whid, nama_device, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
          row
        );
      }
      console.log('✅ Seeded activity_logs table.');
    }

    // 5. Seed error_logs table
    const [errCount] = await connection.execute('SELECT COUNT(*) as count FROM error_logs');
    if (errCount[0].count === 0) {
      const payloadObj = {
        SalesInvoiceHeaderId: "00000000-0000-0000-0000-000000000000",
        NoBukti: "0125/EPU/IN/IV/26",
        NoFjDulu: null,
        TglFakturTerdahulu: null,
        TglFaktur: "2026-04-27T09:37:30",
        TglJthTmp: "2026-05-11T09:37:30",
        TypePajak: null,
        TglFakturp: "2026-04-27T09:37:30",
        NoFakturP: null,
        TypeTrn: null,
        NamaKirim: null,
        Keterangan: null,
        ExtDisPersen: 0.0,
        AddMinFeePersen: 0.0,
        AdminFee: 0.0,
        TypePpn: "E",
        TaxAdditionalNote: "",
        Dpp: 50719800.0,
        Ppn: 5579178.0,
        PpnNewConcept: false,
        AdditionalChargeCode: null,
        AdditionalChargePercent: 0.0,
        AdditionalCharge: 0.0,
        KodePph: "",
        PphPersen: 0.0,
        Pph: 0.0,
        KodePbl: "",
        PblPersen: 0.0,
        Pbl: 0.0,
        TypePbl: "",
        OngkosAngkut: 0.0,
        GrandTotal: 5639178.0,
        SisaTotal: 5639178.0,
        PakaiOrderFlag: false,
        UangMuka: 0.0,
        TipeBayar: "IDR",
        TutupBukuFlag: false,
        Kurs: 1.0,
        KodeCrc: "IDR",
        SjFlag: false,
        KodeCc: "ACC",
        NoKMK: null,
        TglKMK: "2026-05-13T09:37:30",
        SjJournalId: "44111111-1111-1111-1111-111111111111",
        RefundTransactionId: null,
        CreditNotePersen: 0.0,
        CreditNote: 0.0,
        CreditNotePersen1: 0.0,
        CreditNote1: 0.0,
        Net: 5639178.0,
        SalesOrderId: null,
        AllSalesOrderId: "d8d2fe1a-2814-42ee-8a7d-41b75418ef1b;c01bf9bb-a19f-4b5c-ba2a-5f34dfff4845;9f6b6185-13cb-4c52-b51e-e4baf8f9a9be",
        DeliveryPermitId: "f50df1d7-2c61-49be-873c-1ff11133cf564;12015558-7f85-4801-b0d7-28b78dd17d4d;c53e7069-8234-4474-ad06-57e016a31788;d23d27eb-e684-4abd-88ae-59779e18e5a;403fb877-3a56-4aff-8dd8431c59aa;c2e91243-388c-4583-9173-750e81a82838;86f5afaa-a9a2-47c2-82fd-a9406ee12188;209660da-be34-434b-b4ae-bd8b9cb19484;90bc68bb-af83-4739-9176-ec59050f42df;1b10beb8-237b-4a92-81cf-8e4ee0ee7ffb;050f42df-e4baf8f9a9be"
      };

      const exceptionObj = {
        ClassName: "System.NullReferenceException",
        Message: "Object reference not set to an instance of an object.",
        Data: null,
        InnerException: null,
        HelpURL: null,
        StackTraceString: "   at MASERP.Services.SalesInvoiceValidator.VerifyAllRequiredFieldsAreValid(SalesInvoiceHeader currentInvoiceHeader, Context db)\r\n   at MASERP.Controllers.Modules.Sales.SalesInvoiceTransactionController.Post(SalesInvoiceHeader currentInvoiceHeader, String dataSourceType) in C:\\ProgramData\\Jenkins\\workspace\\nMASERP Services, Version=1.999.3.0, Culture=neutral, PublicKeyToken=null\\MASERP.Services.SalesInvoiceValidator.cs:line 1928",
        RemoteStackTraceString: null,
        RemoteStackIndex: 0,
        ExceptionMethod: "8\nVerifyAllRequiredFieldsAreValid\nMASERP.Services, Version=1.999.3.0, Culture=neutral, PublicKeyToken=null\nMASERP.Domian.Models.AccountReceivable.SalesInvoiceHeader, MASERP.Persistence.Context, MASERP.Domain.Models.UserDto, System.Boolean",
        HResult: -2147467261,
        Source: "MASERP.Services",
        WatsonBuckets: null
      };

      const errLogs = [
        [
          '2026-05-13 09:52:35', 
          'ayu', 
          'FIN2', 
          'POST', 
          'http://172.16.16.33/api/salesinvoiceTransaction', 
          'NullReferenceException', 
          JSON.stringify(payloadObj), 
          JSON.stringify(exceptionObj), 
          'ERP', 
          '2026-06-26 10:41:14', 
          0, 
          'Error'
        ]
      ];

      for (const row of errLogs) {
        await connection.execute(
          'INSERT INTO error_logs (tgl, user_name, role_name, method, url, error_type_name, payload, exception, data_source_type, hit_url_date, response_code, response_message, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
          row
        );
      }
      console.log('✅ Seeded error_logs table.');
    }

  } catch (error) {
    console.error('❌ Error during log migrations:', error);
  } finally {
    await connection.end();
    console.log('Database connection closed.');
  }
}

run();
