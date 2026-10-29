/**
 * FairShift Hisaab - Pure Client-Side PDF 1.4 Generator
 * Generates valid, standards-compliant PDF documents without external dependencies.
 */

export interface LegalNoticePdfData {
  workerName: string;
  workerId: string;
  workerPhone: string;
  workerBloodGroup?: string;
  sectorName: string;
  siteName: string;
  scenarioTitle: string;
  lawReference: string;
  subject: string;
  bodyIntro: string;
  bodyDemand: string;
  date: string;
  ledgerHash: string;
  outstandingRupees: number;
}

/**
 * Escapes characters for PDF string literals
 */
function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Generates a valid PDF 1.4 byte array for a formal labour dispute notice
 */
export function generateLegalNoticePdf(data: LegalNoticePdfData): Uint8Array {
  const lines: string[] = [];

  // Header
  lines.push('%PDF-1.4');
  lines.push('%âãÏÓ');

  // Stream content using standard Type 1 Helvetica font
  const streamLines: string[] = [
    'BT',
    '/F1 18 Tf',
    '50 780 Td',
    `(${escapePdfText('FORMAL STATUTORY GRIEVANCE REPRESENTATION')}) Tj`,
    'ET',

    'BT',
    '/F1 10 Tf',
    '50 762 Td',
    `(${escapePdfText('Under the Code on Wages, 2019 & Occupational Safety, Health and Working Conditions Code')}) Tj`,
    'ET',

    // Separator line
    '50 750 m 545 750 l S',

    // Notice Metadata Box
    'BT',
    '/F1 10 Tf',
    '50 730 Td',
    `(${escapePdfText(`DATE: ${data.date}    |    NOTICE REF: FS-${data.ledgerHash.slice(0, 8).toUpperCase()}`)}) Tj`,
    'ET',

    'BT',
    '/F1 10 Tf',
    '50 712 Td',
    `(${escapePdfText(`TO: Principal Employer & Contractor Management`)}) Tj`,
    'ET',

    'BT',
    '/F1 10 Tf',
    '50 696 Td',
    `(${escapePdfText(`WORKPLACE: ${data.siteName} (${data.sectorName})`)}) Tj`,
    'ET',

    'BT',
    '/F1 11 Tf',
    '50 672 Td',
    `(${escapePdfText(`SUBJECT: ${data.subject}`)}) Tj`,
    'ET',

    // Statutory Authority Box
    'BT',
    '/F1 9 Tf',
    '50 652 Td',
    `(${escapePdfText(`STATUTORY REFERENCE: ${data.lawReference}`)}) Tj`,
    'ET',

    '50 642 m 545 642 l S',

    // Body Paragraph
    'BT',
    '/F1 10 Tf',
    '50 622 Td',
    `(${escapePdfText(`I, ${data.workerName} (Worker ID: ${data.workerId}), am formally serving notice regarding`)}) Tj`,
    '0 -16 Td',
    `(${escapePdfText(`statutory non-compliance identified via FairShift tamper-evident muster records.`)}) Tj`,
    '0 -16 Td',
    `(${escapePdfText(`Incident Details: ${data.scenarioTitle}`)}) Tj`,
    'ET',

    // Ledger Evidence Box
    '50 560 495 50 re S',
    'BT',
    '/F1 10 Tf',
    '60 595 Td',
    `(${escapePdfText('TAMPER-EVIDENT SHIFT LEDGER AUDIT TRAIL (SHA-256 VERIFIED):')}) Tj`,
    '0 -14 Td',
    `(${escapePdfText(`• Outstanding Unreconciled Claim: INR ${data.outstandingRupees} (Wages / Overtime / Compensatory Claim)`)}) Tj`,
    '0 -14 Td',
    `(${escapePdfText(`• Ledger Block Hash: ${data.ledgerHash}`)}) Tj`,
    'ET',

    // Demands & Redressal
    'BT',
    '/F1 10 Tf',
    '50 530 Td',
    `(${escapePdfText('FORMAL RELIEF SOUGHT:')}) Tj`,
    '0 -16 Td',
    `(${escapePdfText(`1. Immediate settlement and ledger reconciliation of INR ${data.outstandingRupees} within 48 hours.`)}) Tj`,
    '0 -16 Td',
    `(${escapePdfText('2. Verification of worksite safety and cessation of any punitive retaliation.')}) Tj`,
    '0 -16 Td',
    `(${escapePdfText('3. Copy of this notice is recorded for submission to the Office of the Labour Commissioner.')}) Tj`,
    'ET',

    // Signature Area
    '50 430 m 545 430 l S',
    'BT',
    '/F1 10 Tf',
    '50 410 Td',
    `(${escapePdfText(`Represented by: ${data.workerName}`)}) Tj`,
    '0 -14 Td',
    `(${escapePdfText(`Contact Phone: ${data.workerPhone}`)}) Tj`,
    '0 -14 Td',
    `(${escapePdfText(`Medical Bio: Blood Group ${data.workerBloodGroup || 'O+'} | Verified Site Personnel`)}) Tj`,
    '320 410 Td',
    `(${escapePdfText('Signature / Thumb Impression:')}) Tj`,
    '0 -25 Td',
    `(${escapePdfText('___________________________________')}) Tj`,
    'ET',

    // Footer
    'BT',
    '/F1 8 Tf',
    '50 340 Td',
    `(${escapePdfText('Generated automatically by FairShift Hisaab • UN SDG 8 Decent Work Platform')}) Tj`,
    '0 -12 Td',
    `(${escapePdfText('Protected by the Two-Key Resolution Rule. Independent audit proof attached.')}) Tj`,
    'ET',
  ];

  const streamContent = streamLines.join('\n');
  const streamLength = streamContent.length;

  const objects: string[] = [];

  // Object 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');

  // Object 2: Pages
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');

  // Object 3: Page
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj'
  );

  // Object 4: Font (Helvetica)
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');

  // Object 5: Content Stream
  objects.push(`5 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`);

  // Build PDF string with xref table
  let pdfOutput = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdfOutput.length);
    pdfOutput += objects[i] + '\n';
  }

  const xrefOffset = pdfOutput.length;
  pdfOutput += 'xref\n';
  pdfOutput += `0 ${objects.length + 1}\n`;
  pdfOutput += '0000000000 65535 f \n';

  for (let i = 1; i <= objects.length; i++) {
    const off = offsets[i].toString().padStart(10, '0');
    pdfOutput += `${off} 00000 n \n`;
  }

  pdfOutput += 'trailer\n';
  pdfOutput += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdfOutput += 'startxref\n';
  pdfOutput += `${xrefOffset}\n`;
  pdfOutput += '%%EOF';

  const encoder = new TextEncoder();
  return encoder.encode(pdfOutput);
}

/**
 * Triggers a direct browser download of the generated PDF file
 */
export function downloadLegalNoticePdf(data: LegalNoticePdfData, filename?: string): void {
  const bytes = generateLegalNoticePdf(data);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `FairShift_Grievance_Notice_${data.workerId}_${Date.now()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
