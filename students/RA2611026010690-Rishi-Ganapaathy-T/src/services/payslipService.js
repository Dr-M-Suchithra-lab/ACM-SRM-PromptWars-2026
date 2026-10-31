/**
 * Transparent Payslip Service
 * Computes itemized wage breakdowns (regular, overtime multiplier, deductions)
 * and generates plain-language, low-literacy friendly "Why this amount" explanations in EN/TA/HI.
 */

const { getRepository } = require('../repos');
const { getIndustryConfig } = require('../config/industries');

/**
 * Generate plain-language explanation of wages in the worker's chosen language
 * @param {object} p - Calculation summary
 * @param {string} lang - 'en' | 'ta' | 'hi'
 * @returns {string} Plain language explanation
 */
function generatePlainLanguageExplanation(p, lang = 'en') {
  const sym = p.currencySymbol || '₹';
  const round = (num) => Math.round(num * 100) / 100;

  const taDedMap = {
    'Employees Provident Fund (12%)': 'தொழிலாளர் வருங்கால வைப்பு நிதி (12%)',
    'Employees Provident Fund': 'தொழிலாளர் வருங்கால வைப்பு நிதி',
    EPF: 'வருங்கால வைப்பு நிதி',
    'Site Safety Welfare Fund': 'பணித்தள பாதுகாப்பு நல நிதி',
    'Professional Tax': 'தொழில் வரி',
    'Staff Welfare Fund': 'பணியாளர் நல நிதி',
  };

  const hiDedMap = {
    'Employees Provident Fund (12%)': 'कर्मचारी भविष्य निधि (12%)',
    'Employees Provident Fund': 'कर्मचारी भविष्य निधि',
    EPF: 'भविष्य निधि',
    'Site Safety Welfare Fund': 'कार्यस्थल सुरक्षा कल्याण कोष',
    'Professional Tax': 'वृत्तिक कर',
    'Staff Welfare Fund': 'कर्मचारी कल्याण कोष',
  };

  if (lang === 'ta') {
    return (
      `நீங்கள் இந்த காலகட்டத்தில் மொத்தம் ${p.regularHours} வழக்கமான மணிநேரம் (மணிக்கு ${sym}${round(p.baseHourlyRate)}) ` +
      `மற்றும் ${p.overtimeHours} கூடுதல் மணிநேரம் ${p.overtimeMultiplier} மடங்கு விகிதத்தில் (மணிக்கு ${sym}${round(p.effectiveOtRate)}) ` +
      `வேலை செய்துள்ளீர்கள். வழக்கமான ஊதியம் ${sym}${round(p.regularPay)}, கூடுதல் நேர ஊதியம் ${sym}${round(p.overtimePay)}. ` +
      `மொத்த சம்பளம் ${sym}${round(p.grossPay)}. ` +
      `சட்டப்பூர்வ பிடித்தங்கள் (${p.deductionsBreakdown.map((d) => `${taDedMap[d.name] || d.name}: ${sym}${round(d.amount)}`).join(', ') || 'இல்லை'}) ` +
      `மொத்தம் ${sym}${round(p.totalDeductions)} கழித்த பிறகு, உங்கள் வங்கிக் கணக்கில் வரவு வைக்கப்படும் நிகரத் தொகை ${sym}${round(p.netPay)} ஆகும்.`
    );
  }

  if (lang === 'hi') {
    return (
      `आपने इस अवधि में कुल ${p.regularHours} सामान्य घंटे (${sym}${round(p.baseHourlyRate)}/घंटा) ` +
      `और ${p.overtimeHours} ओवरटाइम घंटे ${p.overtimeMultiplier} गुना दर पर (${sym}${round(p.effectiveOtRate)}/घंटा) ` +
      `काम किया है। सामान्य वेतन ${sym}${round(p.regularPay)}, ओवरटाइम वेतन ${sym}${round(p.overtimePay)} बना। ` +
      `कुल आय ${sym}${round(p.grossPay)} है। ` +
      `अनिवार्य कटौतियां (${p.deductionsBreakdown.map((d) => `${hiDedMap[d.name] || d.name}: ${sym}${round(d.amount)}`).join(', ') || 'शून्य'}) ` +
      `कुल ${sym}${round(p.totalDeductions)} घटाने के बाद, आपके खाते में जमा होने वाली शुद्ध राशि ${sym}${round(p.netPay)} है।`
    );
  }

  // Default: English
  return (
    `You worked ${p.regularHours} standard hours at ${sym}${round(p.baseHourlyRate)}/hr ` +
    `plus ${p.overtimeHours} overtime hours at ${p.overtimeMultiplier}x rate (${sym}${round(p.effectiveOtRate)}/hr). ` +
    `Your base wage is ${sym}${round(p.regularPay)} and overtime pay is ${sym}${round(p.overtimePay)}, totaling gross earnings of ${sym}${round(p.grossPay)}. ` +
    `After deductions of ${sym}${round(p.totalDeductions)} (${p.deductionsBreakdown.map((d) => `${d.name}: ${sym}${round(d.amount)}`).join(', ') || 'None'}), ` +
    `your take-home pay is ${sym}${round(p.netPay)}.`
  );
}

/**
 * Pure calculation function for itemized payslip
 * @param {object} params
 * @param {number} params.regularHours
 * @param {number} params.overtimeHours
 * @param {number} params.baseHourlyRate
 * @param {object} params.wageRules - From industry config
 * @param {string} [params.language='en']
 * @returns {object} Full payslip object
 */
function calculatePayslipMath({ regularHours, overtimeHours, baseHourlyRate, wageRules, language = 'en' }) {
  const round = (val) => Math.round(val * 100) / 100;
  const regHrs = round(Math.max(0, regularHours));
  const otHrs = round(Math.max(0, overtimeHours));
  const rate = round(Math.max(0, baseHourlyRate));
  const otMultiplier = wageRules.overtimeMultiplier || 1.5;
  const effectiveOtRate = round(rate * otMultiplier);

  const regularPay = round(regHrs * rate);
  const overtimePay = round(otHrs * effectiveOtRate);
  const grossPay = round(regularPay + overtimePay);

  // Compute deductions based on rules
  const deductionsBreakdown = (wageRules.deductions || []).map((d) => {
    let amount = 0;
    if (d.type === 'percentage') {
      amount = round(regularPay * d.rate);
    } else if (d.type === 'fixed') {
      amount = round(d.amount);
    }
    return { id: d.id, name: d.name, amount };
  });

  const totalDeductions = round(deductionsBreakdown.reduce((sum, d) => sum + d.amount, 0));
  const netPay = round(Math.max(0, grossPay - totalDeductions));

  const explanationPayload = {
    regularHours: regHrs,
    overtimeHours: otHrs,
    baseHourlyRate: rate,
    overtimeMultiplier: otMultiplier,
    effectiveOtRate,
    regularPay,
    overtimePay,
    grossPay,
    deductionsBreakdown,
    totalDeductions,
    netPay,
    currencySymbol: wageRules.currencySymbol || '₹',
    currencyCode: wageRules.currencyCode || 'INR',
  };

  const plainExplanation = generatePlainLanguageExplanation(explanationPayload, language);

  return {
    ...explanationPayload,
    plainExplanation,
  };
}

class PayslipService {
  constructor() {
    this.repo = getRepository();
  }

  /**
   * Calculate payslip for a worker for a given period or all completed shifts
   * @param {string} workerId
   * @param {string} [period] - YYYY-MM or 'recent'
   * @param {string} [language] - Override language ('en', 'ta', 'hi')
   * @returns {Promise<object>}
   */
  async getWorkerPayslip(workerId, period = 'recent', language = null) {
    const user = await this.repo.findUserById(workerId);
    if (!user) throw new Error('Worker not found');

    const industryConfig = getIndustryConfig(user.industry);
    const shifts = await this.repo.listShiftsByWorker(workerId);
    const completed = shifts.filter((s) => s.status === 'completed');

    // Filter by period if specified
    const filteredShifts = period && period !== 'recent'
      ? completed.filter((s) => s.date.startsWith(period))
      : completed.slice(0, 14); // Recent 2 weeks

    const regularHours = filteredShifts.reduce((sum, s) => sum + (s.regularHours || 0), 0);
    const overtimeHours = filteredShifts.reduce((sum, s) => sum + (s.overtimeHours || 0), 0);
    const baseHourlyRate = user.baseHourlyRate || (user.dailyRate ? user.dailyRate / 8 : 100);

    const preferredLang = language || user.preferredLanguage || 'en';

    const payslip = calculatePayslipMath({
      regularHours,
      overtimeHours,
      baseHourlyRate,
      wageRules: industryConfig.wageRules,
      language: preferredLang,
    });

    return {
      payslipId: `PS-${workerId}-${period}`,
      workerId: user.id,
      workerName: user.name,
      roleTitle: user.roleTitle,
      department: user.department,
      industry: user.industry,
      period,
      shiftCount: filteredShifts.length,
      shifts: filteredShifts.map((s) => ({
        id: s.id,
        date: s.date,
        shiftName: s.shiftName,
        totalHours: s.totalHours,
        regularHours: s.regularHours,
        overtimeHours: s.overtimeHours,
      })),
      ...payslip,
    };
  }
}

module.exports = {
  PayslipService,
  calculatePayslipMath,
  generatePlainLanguageExplanation,
};

