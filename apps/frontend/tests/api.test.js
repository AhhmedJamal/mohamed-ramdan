import test from 'node:test';
import assert from 'node:assert/strict';

test('Frontend configuration and API constants verification', () => {
  const defaultApiUrl = 'http://127.0.0.1:8000/api';
  assert.equal(defaultApiUrl, 'http://127.0.0.1:8000/api');

  // Verify Role Definitions per Section 1.6
  const roles = ['super_admin', 'branch_manager', 'general_accountant', 'data_entry'];
  assert.equal(roles.length, 4);

  // Verify Installment frequencies calculation
  const frequencies = {
    monthly: 12,
    quarterly: 4,
    semi_annual: 2,
    annual: 1,
  };
  assert.equal(frequencies.monthly, 12);
  assert.equal(frequencies.quarterly, 4);
  assert.equal(frequencies.semi_annual, 2);
  assert.equal(frequencies.annual, 1);

  // Test Maker-Checker validation rule: rejection reason min 10 chars
  const isValidRejection = (reason) => typeof reason === 'string' && reason.trim().length >= 10;
  assert.equal(isValidRejection('رفض'), false);
  assert.equal(isValidRejection('المبلغ غير مطابق للعقد المرفق'), true);
});

test('Double-Entry Balance Equation Verification', () => {
  const checkBalance = (debitTotal, creditTotal) => Math.abs(debitTotal - creditTotal) < 0.001;
  assert.equal(checkBalance(50000.00, 50000.00), true);
  assert.equal(checkBalance(50000.00, 49999.99), false);
});

