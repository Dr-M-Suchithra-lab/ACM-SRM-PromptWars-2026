export interface ShiftRecord {
  hours: number;
  ratePerHour: number;
  totalRupees: number;
  timestamp?: string;
  notes?: string;
}

export interface WorkReceipt {
  id: string;
  workerId: string;
  shiftDate: string; // YYYY-MM-DD
  agreed: ShiftRecord;
  worked: ShiftRecord;
  paid: ShiftRecord;
  status: 'MATCH' | 'NEEDS_REVIEW';
  explanation: string;
  hourDifference: number; // worked.hours - paid.hours
  rupeeDifference: number; // worked.totalRupees - paid.totalRupees
  auditHistory?: Array<{
    timestamp: string;
    editorId: string;
    field: 'agreed' | 'worked' | 'paid';
    previous: ShiftRecord;
    updated: ShiftRecord;
    reason: string;
  }>;
}

/**
 * Compares Agreed, Worked, and Paid records.
 * The core Two-Key principle: no mismatch is ignored.
 */
export function compareReceipt(
  agreed: ShiftRecord,
  worked: ShiftRecord,
  paid: ShiftRecord
): {
  status: 'MATCH' | 'NEEDS_REVIEW';
  hourDifference: number;
  rupeeDifference: number;
  explanation: string;
} {
  const hourDiff = Number((worked.hours - paid.hours).toFixed(2));
  const rupeeDiff = Math.round(worked.totalRupees - paid.totalRupees);

  if (Math.abs(hourDiff) < 0.05 && Math.abs(rupeeDiff) < 1) {
    return {
      status: 'MATCH',
      hourDifference: 0,
      rupeeDifference: 0,
      explanation: 'Paid amount matches recorded work hours exactly.',
    };
  }

  let explanation = '';
  if (hourDiff > 0 && rupeeDiff > 0) {
    explanation = `Worked ${hourDiff} hour(s) more than paid. Unpaid balance of ₹${rupeeDiff}.`;
  } else if (hourDiff > 0 && rupeeDiff <= 0) {
    explanation = `Logged ${hourDiff} extra hour(s), but paid wage matches or exceeds expected rate.`;
  } else if (hourDiff < 0) {
    explanation = `Paid for ${Math.abs(hourDiff)} hour(s) more than recorded worked hours.`;
  } else {
    explanation = `Pay discrepancy detected: difference of ₹${Math.abs(rupeeDiff)}.`;
  }

  return {
    status: 'NEEDS_REVIEW',
    hourDifference: hourDiff,
    rupeeDifference: rupeeDiff,
    explanation,
  };
}

/**
 * Creates or updates a work receipt with immutable edit history.
 */
export function recordReceiptEdit(
  existingReceipt: WorkReceipt,
  field: 'agreed' | 'worked' | 'paid',
  newRecord: ShiftRecord,
  editorId: string,
  reason: string
): WorkReceipt {
  const history = existingReceipt.auditHistory || [];
  const previous = { ...existingReceipt[field] };

  const updatedHistory = [
    ...history,
    {
      timestamp: new Date().toISOString(),
      editorId,
      field,
      previous,
      updated: { ...newRecord },
      reason,
    },
  ];

  const updatedReceipt: WorkReceipt = {
    ...existingReceipt,
    [field]: { ...newRecord },
    auditHistory: updatedHistory,
  };

  const comparison = compareReceipt(
    updatedReceipt.agreed,
    updatedReceipt.worked,
    updatedReceipt.paid
  );

  return {
    ...updatedReceipt,
    status: comparison.status,
    hourDifference: comparison.hourDifference,
    rupeeDifference: comparison.rupeeDifference,
    explanation: comparison.explanation,
  };
}
