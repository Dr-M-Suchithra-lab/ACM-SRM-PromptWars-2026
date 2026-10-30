// National & Sector Helplines
// NOTE: VERIFY BEFORE LAUNCH. Numbers are standard national helplines in India.

export interface HelplineItem {
  id: string;
  nameKey: string;
  defaultName: string;
  number: string;
  category: 'emergency' | 'legal' | 'women' | 'labour';
  descriptionKey: string;
  defaultDescription: string;
  isTollFree: boolean;
}

export const HELPLINES: HelplineItem[] = [
  {
    id: 'police',
    nameKey: 'helpline.police.name',
    defaultName: 'National Emergency / Police',
    number: '112',
    category: 'emergency',
    descriptionKey: 'helpline.police.desc',
    defaultDescription: 'Immediate danger, physical violence, or site threats',
    isTollFree: true,
  },
  {
    id: 'ambulance',
    nameKey: 'helpline.ambulance.name',
    defaultName: 'Medical Emergency / Ambulance',
    number: '108',
    category: 'emergency',
    descriptionKey: 'helpline.ambulance.desc',
    defaultDescription: 'Worksite injury, heat stroke, or acute medical trauma',
    isTollFree: true,
  },
  {
    id: 'women',
    nameKey: 'helpline.women.name',
    defaultName: 'Women Helpline (Domestic & Workplace)',
    number: '181',
    category: 'women',
    descriptionKey: 'helpline.women.desc',
    defaultDescription: 'Harassment, mistreatment, or abuse of women workers',
    isTollFree: true,
  },
  {
    id: 'nalsa',
    nameKey: 'helpline.nalsa.name',
    defaultName: 'NALSA Free Legal Aid Helpline',
    number: '15100',
    category: 'legal',
    descriptionKey: 'helpline.nalsa.desc',
    defaultDescription: 'Free legal advice and representation for unorganized workers',
    isTollFree: true,
  },
  {
    id: 'eshram',
    nameKey: 'helpline.eshram.name',
    defaultName: 'Ministry of Labour e-Shram Support',
    number: '14434',
    category: 'labour',
    descriptionKey: 'helpline.eshram.desc',
    defaultDescription: 'Social security benefits, registration, and wage grievances',
    isTollFree: true,
  },
];
