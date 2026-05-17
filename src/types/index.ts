export interface Loan {
  name: string;
  repAcct: string;
  applId: string;
  productName: string;
  openingDate: string;
  firstRepaymentDate: string;
  maturityDate: string;
  termMo: number;
  commit: number;
  rate: number;
  overdue: number;
  dpd: number;
  type: ProductType;
  daily: number;
  weekly: number;
  monthly: number;
  bullet: number;
  officer: string;
  daysToNext: number | null;
  _cells?: string[];
}

export type ProductType = 'trading' | 'agric' | 'salary' | 'property' | 'vehicle' | 'sme' | 'personal' | 'std';

export interface ProductMeta {
  type: ProductType;
  count: number;
}

export interface ProductStats {
  count: number;
  overdue: number;
  overdueCount: number;
  commit: number;
  type: ProductType;
}

export interface ComparisonResult {
  name: string;
  repAcct: string;
  productName: string;
  baselineOverdue: number;
  currentOverdue: number;
  overdueDelta: number;
  baselineDPD: number;
  currentDPD: number;
  dpdDelta: number;
  status: 'Recovered' | 'Worsening' | 'Stable' | 'New' | 'Resolved';
}

export interface NLQFilters {
  product: ProductType | null;
  minCommit: number | null;
  maxCommit: number | null;
  minDPD: number | null;
  maxDPD: number | null;
  overdueOnly: boolean;
  maturityDays: number | null;
  maturityMonths: number | null;
  maturityThisMonth: boolean;
  maturityNextMonth: boolean;
  minOverdue: number | null;
  maxOverdue: number | null;
  officer: string | null;
  maxDaysToNext: number | null;
  instalmentOverdue: boolean;
  openedAfter: string | null;
  openedBefore: string | null;
  loanClass: string | null;
  borrowerName: string | null;
}

export interface Anomaly {
  id: string;
  type: string;
  desc: string;
}

export interface ColumnDef {
  l: string;
  k: string;
  cls?: string;
  badge?: boolean;
  num?: boolean;
  daysCol?: boolean;
  th?: string;
}

export interface ScheduleGroup {
  name: string;
  repAcct: string;
  productName: string;
  commit: number;
  overdue: number;
  dpd: number;
  openingDate: string;
  maturityDate: string;
  daysSinceOpen: number;
  daysToMat: number;
  priority: string;
  priorityCls: string;
  type: ProductType;
}

export interface ScheduleData {
  postDisb: ScheduleGroup[];
  recovery: ScheduleGroup[];
  urgentMat: ScheduleGroup[];
  routine: ScheduleGroup[];
}

export interface SnapshotMeta {
  id: string;
  timestamp: string;
  filename: string;
  loanCount: number;
  overdueCount: number;
  totalArrears: number;
  avgDPD: number;
}

export type Theme = 'light' | 'dark' | 'midnight';

export type Page = 'landing' | 'analyze' | 'compare' | 'settings';

export type AIProvider = 'gemini' | 'groq' | 'openrouter';
