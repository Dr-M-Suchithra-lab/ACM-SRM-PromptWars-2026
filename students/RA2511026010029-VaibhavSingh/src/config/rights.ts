export interface RightScenario {
  id: string;
  titleKey: string;
  defaultTitle: string;
  icon: string;
  doThisNow: [string, string, string]; // 3 short steps
  keepThisProof: string[];
  helplineIds: string[];
  letterTemplate: {
    subject: string;
    bodyIntro: string;
    bodyDemand: string;
  };
  lastReviewed: string;
}

export const LEGAL_DISCLAIMER = 'General information, not legal advice.';
export const LAST_REVIEWED_DATE = 'October 2026';

export const RIGHTS_SCENARIOS: RightScenario[] = [
  {
    id: 'unpaid-wage',
    titleKey: 'rights.unpaid.title',
    defaultTitle: 'I was not paid, or paid less',
    icon: 'Banknote',
    doThisNow: [
      'Save your Work Receipts from FairShift showing Agreed vs Paid amounts.',
      'Show your mismatch summary to your thekedar or facility manager.',
      'If not settled within 48 hours, file a grievance with Labour Commissioner or NALSA 15100.',
    ],
    keepThisProof: [
      'FairShift tamper-evident shift receipts with timestamps',
      'Bank transaction SMS or cash payment vouchers',
      'Gate pass, muster roll photo, or coworker witness numbers',
    ],
    helplineIds: ['nalsa', 'eshram'],
    letterTemplate: {
      subject: 'Formal Notice of Wage Arrears and Unpaid Overtime',
      bodyIntro:
        'I have completed the recorded work shifts listed below at the designated worksite under your supervision.',
      bodyDemand:
        'As per statutory minimum wage guidelines and our agreed shift contract, I request the immediate clearance of outstanding wages totaling INR {{gapRupees}} within 7 working days.',
    },
    lastReviewed: LAST_REVIEWED_DATE,
  },
  {
    id: 'workplace-injury',
    titleKey: 'rights.injury.title',
    defaultTitle: 'I got hurt at work',
    icon: 'Bandage',
    doThisNow: [
      'Call site medical aid or ambulance 108 immediately and get first aid.',
      'Take photos of the injury and the site hazard before moving machinery.',
      'Insist on an entry in the Site Accident Register before leaving the campus/site.',
    ],
    keepThisProof: [
      'Hospital outpatient slip, treatment bills, and medical prescription',
      'FairShift Before-hazard photo and shift check-in stamp',
      'Contact numbers of 2 coworkers who saw the incident',
    ],
    helplineIds: ['ambulance', 'nalsa'],
    letterTemplate: {
      subject: 'Intimation of Workplace Injury and Medical Reimbursement Claim',
      bodyIntro:
        'I sustained physical injuries during the lawful performance of duty on {{date}} at {{zone}}.',
      bodyDemand:
        'I request full reimbursement of medical treatment expenses and statutory paid medical leave during recovery.',
    },
    lastReviewed: LAST_REVIEWED_DATE,
  },
  {
    id: 'harassment-abuse',
    titleKey: 'rights.harassment.title',
    defaultTitle: 'I am treated badly or harassed',
    icon: 'ShieldAlert',
    doThisNow: [
      'Move to a well-lit public area near other staff or security cameras.',
      'Submit an anonymous Collective Escrow report or call Women Helpline 181.',
      'Write down exact words, time, and location while fresh in memory.',
    ],
    keepThisProof: [
      'Audio notes or transcribed notes stored in FairShift escrow vault',
      'Names or phone numbers of coworkers present in the zone',
      'Any threatening SMS, WhatsApp messages, or gate pass confiscation records',
    ],
    helplineIds: ['women', 'police', 'nalsa'],
    letterTemplate: {
      subject: 'Confidential Complaint Regarding Workplace Harassment and Intimidation',
      bodyIntro:
        'I am submitting this formal complaint regarding repeated hostile behavior and verbal abuse.',
      bodyDemand:
        'I request an inquiry by the Internal Complaints Committee (ICC) and protection from retaliation.',
    },
    lastReviewed: LAST_REVIEWED_DATE,
  },
  {
    id: 'sudden-termination',
    titleKey: 'rights.termination.title',
    defaultTitle: 'I was told to leave without notice',
    icon: 'UserX',
    doThisNow: [
      'Do not surrender your ID badge or work pass until your full dues are cleared.',
      'Export your FairShift Work Ledger and payslip history immediately.',
      'Demand a written release letter and full payment of earned wages on the same day.',
    ],
    keepThisProof: [
      'Complete FairShift shift history showing months of continuous service',
      'Photos of muster roll, appointment slip, or contractor ID badge',
      'Proof of last worked day and gate entry stamp',
    ],
    helplineIds: ['nalsa', 'eshram'],
    letterTemplate: {
      subject: 'Demand for Statutory Notice Pay and Retrenchment Compensation',
      bodyIntro:
        'My engagement was abruptly halted on {{date}} without the mandatory statutory notice period.',
      bodyDemand:
        'I demand payment in lieu of 30 days notice plus all earned unpaid wages up to my last working shift.',
    },
    lastReviewed: LAST_REVIEWED_DATE,
  },
  {
    id: 'thekedar-disappeared',
    titleKey: 'rights.thekedar_missing.title',
    defaultTitle: 'My thekedar disappeared',
    icon: 'Footprints',
    doThisNow: [
      'Inform the Principal Employer (institution / company site office) directly.',
      'Under the Contract Labour Act, the Principal Employer is legally bound to pay unpaid wages.',
      'Submit a joint complaint signed by you and your fellow crew members.',
    ],
    keepThisProof: [
      'FairShift consensus shift records linking you to this specific site',
      'Thekedar name, vehicle number, phone number, and last known photo',
      'Physical site gate passes or biometric attendance slips',
    ],
    helplineIds: ['nalsa', 'eshram', 'police'],
    letterTemplate: {
      subject: 'Joint Representation to Principal Employer for Unpaid Contract Wages',
      bodyIntro:
        'We, the undersigned contract workers, were engaged through the intermediary contractor who has absconded.',
      bodyDemand:
        'Under Section 21(4) of the Contract Labour Act, the Principal Employer is liable to disburse full wages.',
    },
    lastReviewed: LAST_REVIEWED_DATE,
  },
  {
    id: 'unsafe-conditions',
    titleKey: 'rights.unsafe.title',
    defaultTitle: 'My work is not safe',
    icon: 'AlertTriangle',
    doThisNow: [
      'Step back from high voltage, unsupported trench, or extreme chemical fumes.',
      'File a photo hazard report in FairShift; the clock starts ticking for the Safety Officer.',
      'Under safety laws, you have the right to refuse work that poses imminent mortal danger.',
    ],
    keepThisProof: [
      'Before-photos taken in FairShift showing lack of safety harness, railing, or ventilation',
      'Weather report showing wet bulb / heat index above safety limit',
      'Witness names of other workers in the hazardous zone',
    ],
    helplineIds: ['ambulance', 'police'],
    letterTemplate: {
      subject: 'Emergency Hazard Intimation and Work Pause Notice',
      bodyIntro:
        'This notice informs site management of critical safety deficiencies at {{zone}} on {{date}}.',
      bodyDemand:
        'Work cannot resume safely until certified safety equipment is provided and an inspection certificate issued.',
    },
    lastReviewed: LAST_REVIEWED_DATE,
  },
];
