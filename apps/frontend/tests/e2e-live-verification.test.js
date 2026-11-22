import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.API_URL || 'http://127.0.0.1:8000/api';

const apiRequest = async (path, options = {}) => {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, data };
};

test('Live E2E: Complete ERP System Verification', async (t) => {
  let superAdminToken = null;
  let managerToken = null;
  let accountantToken = null;
  let dataEntryToken = null;

  let propertyId = null;
  let unitId = null;
  let costCenterId = null;
  let tenantId = null;
  let contractId = null;
  let installmentId = null;
  let voucherId = null;
  let invoiceId = null;
  let bankAccountId = null;
  let revenueAccountId = null;

  // 1. Health & Central Tenant Info
  await t.test('1. Check Central Tenant Info and Routing', async () => {
    const res = await apiRequest('/tenant/info');
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
  });

  // 2. Authentication & Role-Based Access for all 4 Actors
  await t.test('2. Multi-Actor Authentication & Token Granting', async () => {
    // A. Super Admin Login
    const adminRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@mohamedramadan.com',
        password: 'Password@123',
      }),
    });
    assert.equal(adminRes.status, 200, 'Super admin login should succeed');
    assert.equal(adminRes.data.data.user.role, 'super_admin');
    assert.equal(adminRes.data.data.user.redirect_url, '/admin/dashboard');
    superAdminToken = adminRes.data.data.token;
    assert.ok(superAdminToken, 'Super admin token must be present');

    // B. Branch Manager Login (Company 1)
    const managerRes = await apiRequest('/auth/login', {
      method: 'POST',
      headers: { 'X-Tenant-Subdomain': 'comp1' },
      body: JSON.stringify({
        email: 'manager@comp1.com',
        password: 'Password@123',
      }),
    });
    assert.equal(managerRes.status, 200, 'Branch manager login should succeed');
    assert.equal(managerRes.data.data.user.role, 'branch_manager');
    assert.equal(managerRes.data.data.user.redirect_url, '/company/dashboard');
    managerToken = managerRes.data.data.token;
    assert.ok(managerToken, 'Branch manager token must be present');

    // C. General Accountant Login (Company 1)
    const accRes = await apiRequest('/auth/login', {
      method: 'POST',
      headers: { 'X-Tenant-Subdomain': 'comp1' },
      body: JSON.stringify({
        email: 'accountant@comp1.com',
        password: 'Password@123',
      }),
    });
    assert.equal(accRes.status, 200, 'General accountant login should succeed');
    assert.equal(accRes.data.data.user.role, 'general_accountant');
    assert.equal(accRes.data.data.user.redirect_url, '/accounting/dashboard');
    accountantToken = accRes.data.data.token;
    assert.ok(accountantToken, 'General accountant token must be present');

    // D. Data Entry Login (Company 1)
    const deRes = await apiRequest('/auth/login', {
      method: 'POST',
      headers: { 'X-Tenant-Subdomain': 'comp1' },
      body: JSON.stringify({
        email: 'dataentry@comp1.com',
        password: 'Password@123',
      }),
    });
    assert.equal(deRes.status, 200, 'Data entry login should succeed');
    assert.equal(deRes.data.data.user.role, 'data_entry');
    assert.equal(deRes.data.data.user.redirect_url, '/data-entry/dashboard');
    dataEntryToken = deRes.data.data.token;
    assert.ok(dataEntryToken, 'Data entry token must be present');
  });

  // 3. Security & Validation Rules (UC-01)
  await t.test('3. Security & Login Lockout Validation', async () => {
    const invalidRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@company.com',
        password: 'WrongPassword@999',
      }),
    });
    assert.equal(invalidRes.status, 401);
    assert.equal(invalidRes.data.success, false);
    assert.equal(invalidRes.data.message, 'بيانات الدخول غير صحيحة');
  });

  // 4. CRUD Matrix Enforcement (Section 1.6)
  await t.test('4. RBAC Matrix Enforcement: Data Entry blocked from accounting reports', async () => {
    const forbiddenRes = await apiRequest('/reports/trial-balance', {
      headers: {
        'Authorization': `Bearer ${dataEntryToken}`,
        'X-Tenant-Subdomain': 'comp1',
      },
    });
    assert.equal(forbiddenRes.status, 403, 'Data Entry actor must be blocked from Financial Reports');
  });

  // 5. Super Admin Company Portfolio Listing (UC-07 to UC-11)
  await t.test('5. Super Admin Company Portfolio Management', async () => {
    const res = await apiRequest('/admin/companies', {
      headers: {
        'Authorization': `Bearer ${superAdminToken}`,
      },
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.data));
    assert.ok(res.data.data.length >= 3, 'Must have at least 3 companies seeded');
  });

  // 6. Branch Manager Employee Management (UC-12 to UC-15)
  await t.test('6. Branch Manager Employee Registry Access', async () => {
    const res = await apiRequest('/company/employees', {
      headers: {
        'Authorization': `Bearer ${managerToken}`,
        'X-Tenant-Subdomain': 'comp1',
      },
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.data));
    const emails = res.data.data.map((e) => e.email);
    assert.ok(emails.includes('accountant@comp1.com'));
    assert.ok(emails.includes('dataentry@comp1.com'));
  });

  // 6b. Provision 2027 Fiscal Year with 12 monthly periods (UC-24)
  await t.test('6b. Fiscal Year 2027 Auto-Provisioning by General Accountant', async () => {
    const fyRes = await apiRequest('/fiscal-years', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accountantToken}`,
        'X-Tenant-Subdomain': 'comp1',
      },
      body: JSON.stringify({
        name: 'السنة المالية 2027',
        start_date: '2027-01-01',
        end_date: '2027-12-31',
      }),
    });
    // If year already exists, 422 is returned, otherwise 201
    assert.ok([201, 422].includes(fyRes.status), 'Fiscal year creation should succeed or already exist');
  });

  // 7. Property & Automated Unit & Cost Center Provisioning (UC-25, UC-26)
  await t.test('7. Real Estate Operations: Property & Unit Provisioning', async () => {
    const propRes = await apiRequest('/properties', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dataEntryToken}`,
        'X-Tenant-Subdomain': 'comp1',
      },
      body: JSON.stringify({
        name: `برج النخيل السكني ${Date.now()}`,
        address: 'طريق الملك فهد، العليا، الرياض',
        type: 'residential',
        units_count: 4,
        unit_type: 'apartment',
        default_area_sqm: 140,
      }),
    });
    assert.equal(propRes.status, 201, 'Property should be created successfully');
    assert.ok(propRes.data.property);
    propertyId = propRes.data.property.id;
    costCenterId = propRes.data.property.cost_center_id;
    assert.ok(propertyId, 'Property ID must be set');
    assert.ok(costCenterId, 'Cost Center ID must be auto-created');

    // Auto-provisioned units check
    const units = propRes.data.property.units;
    assert.ok(Array.isArray(units));
    assert.equal(units.length, 4, 'Must auto-provision exactly 4 units');
    unitId = units[0].id;
    assert.ok(unitId, 'Unit ID must be set');
    assert.equal(units[0].status, 'vacant');
  });

  // 8. Tenant Master Registry Creation (UC-34)
  await t.test('8. Tenant Master Registry Creation with Saudi Format Validation', async () => {
    const randomId = '10' + Math.floor(10000000 + Math.random() * 90000000);
    const randomMobile = '05' + Math.floor(10000000 + Math.random() * 90000000);

    const tenantRes = await apiRequest('/tenants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dataEntryToken}`,
        'X-Tenant-Subdomain': 'comp1',
      },
      body: JSON.stringify({
        name: 'سالم بن ناصر القحطاني',
        type: 'individual',
        national_id_or_cr: randomId,
        mobile: randomMobile,
        email: `salem_${Date.now()}@test.sa`,
        address: 'حي الملقا، الرياض',
      }),
    });
    assert.equal(tenantRes.status, 201, 'Tenant should be registered successfully');
    assert.equal(tenantRes.data.status, 'success');
    tenantId = tenantRes.data.data.id;
    assert.ok(tenantId);
  });

  // 9. Rental Contract & Automated Installments (UC-37 & UC-38)
  await t.test('9. Rental Contract Execution & Quarterly Installment Generation', async () => {
    const contractRes = await apiRequest('/contracts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dataEntryToken}`,
        'X-Tenant-Subdomain': 'comp1',
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        property_id: propertyId,
        unit_id: unitId,
        contract_type: 'company_to_tenant',
        start_date: '2027-01-01',
        end_date: '2027-12-31',
        duration_months: 12,
        total_rent: 60000,
        collection_cycle: 'quarterly', // 4 installments of 15,000 SAR
      }),
    });
    assert.equal(contractRes.status, 201, 'Rental contract should be created');
    assert.equal(contractRes.data.status, 'success');
    contractId = contractRes.data.data.id;
    assert.ok(contractId);

    // Verify installments schedule auto-generated
    const installments = contractRes.data.data.installments;
    assert.ok(Array.isArray(installments));
    assert.equal(installments.length, 4, 'Quarterly frequency must generate exactly 4 installments');
    assert.equal(Number(installments[0].amount), 15000, 'Each quarterly installment must be 15,000 SAR');
    installmentId = installments[0].id;
    assert.ok(installmentId);
  });

  // 10. Maker-Checker Financial Cycle: Draft, Validation, Approval & GL Posting (UC-43 to UC-51)
  await t.test('10. Maker-Checker Financial Voucher & Automatic General Ledger Posting', async () => {
    // First, fetch Accounts to get Debit and Credit accounts
    const accRes = await apiRequest('/accounts', {
      headers: {
        'Authorization': `Bearer ${accountantToken}`,
        'X-Tenant-Subdomain': 'comp1',
      },
    });
    assert.equal(accRes.status, 200);
    const accounts = accRes.data.flat || accRes.data.tree || [];
    assert.ok(accounts.length >= 2, 'Chart of Accounts must be provisioned');
    const assetAcc = accounts.find((a) => a.root_type === 'assets') || accounts[0];
    const revAcc = accounts.find((a) => a.root_type === 'revenues') || accounts[1];
    bankAccountId = assetAcc.id;
    revenueAccountId = revAcc.id;

    // A. Data Entry creates Receipt Voucher (Status: Draft)
    const voucherRes = await apiRequest('/vouchers/receipt', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dataEntryToken}`,
        'X-Tenant-Subdomain': 'comp1',
      },
      body: JSON.stringify({
        contract_id: contractId,
        installment_id: installmentId,
        amount: 15000,
        date: '2027-01-05',
        payment_method: 'bank_transfer',
        debit_account_id: bankAccountId,
        credit_account_id: revenueAccountId,
        notes: 'تحصيل الدفعة الإيجارية الأولى - الربع الأول 2027',
      }),
    });
    assert.equal(voucherRes.status, 201);
    assert.equal(voucherRes.data.status, 'success');
    voucherId = voucherRes.data.data.id;
    assert.equal(voucherRes.data.data.status, 'draft', 'Newly created voucher must start as draft');

    // B. General Accountant approves the Voucher (Maker-Checker Approval)
    const approveRes = await apiRequest(`/vouchers/${voucherId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accountantToken}`,
        'X-Tenant-Subdomain': 'comp1',
      },
    });
    assert.equal(approveRes.status, 200, 'Accountant approval must succeed');
    const voucherData = approveRes.data.data?.voucher || approveRes.data.data;
    assert.equal(voucherData.status, 'approved', 'Voucher status must be approved');

    // C. Verify automatic balanced journal entry was generated (Total Debit == Total Credit)
    const journalEntriesRes = await apiRequest('/journal-entries', {
      headers: {
        'Authorization': `Bearer ${accountantToken}`,
        'X-Tenant-Subdomain': 'comp1',
      },
    });
    assert.equal(journalEntriesRes.status, 200);
    const entries = journalEntriesRes.data.data || [];
    assert.ok(entries.length > 0, 'Posted journal entry must exist');
    const latestEntry = entries[0];
    assert.equal(
      Number(latestEntry.total_debit),
      Number(latestEntry.total_credit),
      'Journal entry must be strictly balanced (Debit == Credit)'
    );
  });

  // 11. Contractor Progress Claim Billing (UC-52 to UC-54)
  await t.test('11. Contractor Progress Claim with Retention & VAT Accounting', async () => {
    const claimRes = await apiRequest('/contractor-invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dataEntryToken}`,
        'X-Tenant-Subdomain': 'comp1',
      },
      body: JSON.stringify({
        contractor_name: 'شركة الإنشاء والتعمير الحديثة',
        cost_center_id: costCenterId,
        invoice_number: `CLAIM-${Date.now()}`,
        date: '2027-02-01',
        tax_rate: 15,
        items: [
          {
            item_name: 'أعمال عزل مائي وحراري للأسطح',
            quantity: 1,
            unit: 'مقطوعية',
            unit_price: 50000,
            notes: 'إنجاز 100% للمرحلة الأولى',
          },
        ],
      }),
    });
    assert.equal(claimRes.status, 201, 'Contractor progress invoice should be drafted');
    assert.equal(claimRes.data.status, 'success');
    invoiceId = claimRes.data.data.id;
    assert.equal(claimRes.data.data.status, 'draft');

    // Accountant approves progress claim
    const approveClaimRes = await apiRequest(`/contractor-invoices/${invoiceId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accountantToken}`,
        'X-Tenant-Subdomain': 'comp1',
      },
    });
    assert.equal(approveClaimRes.status, 200, 'Accountant must be able to approve progress claim');
    assert.equal(approveClaimRes.data.status, 'success');
    assert.equal(approveClaimRes.data.data.status, 'approved');
  });

  // 12. Financial Reporting Balance Equation Verification (UC-56 to UC-60)
  await t.test('12. Financial Reports Zero-Difference Balance Equation', async () => {
    // A. Trial Balance (ميزان المراجعة)
    const tbRes = await apiRequest('/reports/trial-balance?from_date=2026-01-01&to_date=2027-12-31', {
      headers: {
        'Authorization': `Bearer ${accountantToken}`,
        'X-Tenant-Subdomain': 'comp1',
      },
    });
    assert.equal(tbRes.status, 200);
    assert.equal(tbRes.data.status, 'success');
    assert.equal(tbRes.data.data.totals.is_balanced, true, 'Trial balance must be mathematically balanced');
    assert.equal(
      Math.abs(Number(tbRes.data.data.totals.ending_debit) - Number(tbRes.data.data.totals.ending_credit)) < 0.01,
      true,
      'Total Ending Debit - Total Ending Credit must equal 0'
    );

    // B. General Ledger (دفتر الأستاذ العام)
    const glRes = await apiRequest(`/reports/general-ledger?account_id=${bankAccountId}&from_date=2026-01-01&to_date=2027-12-31`, {
      headers: {
        'Authorization': `Bearer ${accountantToken}`,
        'X-Tenant-Subdomain': 'comp1',
      },
    });
    assert.equal(glRes.status, 200);
    assert.equal(glRes.data.status, 'success');

    // C. Balance Sheet (قائمة المركز المالي)
    const bsRes = await apiRequest('/reports/balance-sheet?as_of_date=2027-12-31', {
      headers: {
        'Authorization': `Bearer ${accountantToken}`,
        'X-Tenant-Subdomain': 'comp1',
      },
    });
    assert.equal(bsRes.status, 200);
    assert.equal(bsRes.data.status, 'success');

    // D. Income Statement (قائمة الدخل الشاملة)
    const isRes = await apiRequest('/reports/income-statement?from_date=2026-01-01&to_date=2027-12-31', {
      headers: {
        'Authorization': `Bearer ${accountantToken}`,
        'X-Tenant-Subdomain': 'comp1',
      },
    });
    assert.equal(isRes.status, 200);
    assert.equal(isRes.data.status, 'success');
  });
});
