/**
 * Unit Tests: Transparent Payslip Math & Multilingual Explanations
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calculatePayslipMath, generatePlainLanguageExplanation } = require('../src/services/payslipService');

describe('Payslip Calculation Math', () => {
  const constructionWageRules = {
    standardDayHours: 8,
    overtimeMultiplier: 2.0,
    currencySymbol: '₹',
    currencyCode: 'INR',
    deductions: [
      { id: 'epf', name: 'Employees Provident Fund', type: 'percentage', rate: 0.12 },
      { id: 'safety-fund', name: 'Site Safety Welfare Fund', type: 'fixed', amount: 50 },
    ],
  };

  it('correctly computes base pay, 2x OT multiplier, deductions and net pay', () => {
    // 40 regular hours @ ₹100/hr = ₹4,000
    // 10 OT hours @ (100 * 2.0 = ₹200/hr) = ₹2,000
    // Gross = ₹6,000
    // EPF = 12% of regularPay (4000) = ₹480
    // Fixed welfare fund = ₹50
    // Total deductions = ₹530
    // Net pay = 6000 - 530 = ₹5,470
    const payslip = calculatePayslipMath({
      regularHours: 40,
      overtimeHours: 10,
      baseHourlyRate: 100,
      wageRules: constructionWageRules,
      language: 'en',
    });

    assert.equal(payslip.regularPay, 4000);
    assert.equal(payslip.effectiveOtRate, 200);
    assert.equal(payslip.overtimePay, 2000);
    assert.equal(payslip.grossPay, 6000);
    assert.equal(payslip.totalDeductions, 530);
    assert.equal(payslip.netPay, 5470);
  });

  it('correctly handles 1.5x OT multiplier and fixed deductions (College)', () => {
    const collegeWageRules = {
      standardDayHours: 8,
      overtimeMultiplier: 1.5,
      currencySymbol: '₹',
      deductions: [
        { id: 'prof_tax', name: 'Professional Tax', type: 'fixed', amount: 150 },
      ],
    };

    // 20 hours @ ₹150 = ₹3,000
    // 4 OT hours @ (150 * 1.5 = ₹225) = ₹900
    // Gross = ₹3,900
    // Deductions = ₹150
    // Net = ₹3,750
    const payslip = calculatePayslipMath({
      regularHours: 20,
      overtimeHours: 4,
      baseHourlyRate: 150,
      wageRules: collegeWageRules,
      language: 'en',
    });

    assert.equal(payslip.regularPay, 3000);
    assert.equal(payslip.overtimePay, 900);
    assert.equal(payslip.grossPay, 3900);
    assert.equal(payslip.totalDeductions, 150);
    assert.equal(payslip.netPay, 3750);
  });
});

describe('Multilingual Plain Language Explanation Generator', () => {
  const dummyPayload = {
    regularHours: 40,
    overtimeHours: 10,
    baseHourlyRate: 100,
    overtimeMultiplier: 2.0,
    effectiveOtRate: 200,
    regularPay: 4000,
    overtimePay: 2000,
    grossPay: 6000,
    deductionsBreakdown: [{ name: 'EPF', amount: 480 }],
    totalDeductions: 480,
    netPay: 5520,
    currencySymbol: '₹',
  };

  it('generates clear, low-literacy friendly English explanation', () => {
    const text = generatePlainLanguageExplanation(dummyPayload, 'en');
    assert.match(text, /You worked 40 standard hours/);
    assert.match(text, /10 overtime hours at 2x rate/);
    assert.match(text, /take-home pay is ₹5520/);
  });

  it('generates authentic Tamil (தமிழ்) explanation with all numbers and rates intact', () => {
    const text = generatePlainLanguageExplanation(dummyPayload, 'ta');
    assert.match(text, /40 வழக்கமான மணிநேரம்/);
    assert.match(text, /10 கூடுதல்/);
    assert.match(text, /₹5520 ஆகும்/);
  });

  it('generates authentic Hindi (हिन्दी) explanation with all numbers and rates intact', () => {
    const text = generatePlainLanguageExplanation(dummyPayload, 'hi');
    assert.match(text, /40 सामान्य घंटे/);
    assert.match(text, /10 ओवरटाइम घंटे/);
    assert.match(text, /₹5520 है/);
  });
});

