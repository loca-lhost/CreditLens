export const COLUMN_MAP: Record<string, string[]> = {
  repaymentAccount: ['repayment account', 'repaymentacct', 'rep_acct', 'account', 'acct no', 'account number', 'acct number'],
  productName: ['product name', 'product', 'productname', 'facility type', 'loan type', 'arrangement type'],
  customerName: ['customer name', 'customer', 'customername', 'client name', 'client', 'borrower', 'borrower name'],
  openingDate: ['opening date', 'openingdate', 'start date', 'disbursement date', 'value date', 'drawdown date'],
  firstRepaymentDate: ['first repayment date', 'first repayment', 'first repaymentdate', 'firstrepaymentdate', 'next repayment date', 'next payment date'],
  maturityDate: ['maturity date', 'maturitydate', 'end date', 'expiry date', 'due date', 'closure date'],
  term: ['term', 'tenure', 'period', 'loan term', 'duration'],
  commitment: ['commitment', 'committed amount', 'limit', 'facility amount', 'loan amount', 'approved amount', 'sanctioned amount'],
  principal: ['principal', 'principal amount', 'outstanding', 'outstanding balance', 'balance', 'disbursed amount'],
  interestRate: ['interest rate', 'rate', 'interestrate', 'rate %', 'rate(%)', 'annual rate'],
  dueToday: ['due today', 'due today amount', 'due_today', 'installment due', 'payment due'],
  overdue: ['overdue', 'overdue amount', 'arrear', 'arrears', 'past due', 'past due amount'],
  applicationId: ['appl.id', 'appl id', 'application id', 'appid', 'appl_id', 'appl-ID', 'appl.ID', 'ref no', 'reference', 'loan id', 'loan ref'],
  loanStatus: ['status', 'loan status', 'facility status', 'arrangement status', 'record status', 'account status'],
}

export function detectColumns(headerTexts: string[]): Record<string, number> {
  const detected: Record<string, number> = {}
  headerTexts.forEach((text, idx) => {
    const t = text.trim().toLowerCase()
    for (const [key, names] of Object.entries(COLUMN_MAP)) {
      if (names.some(name => t.includes(name))) {
        detected[key] = idx
        break
      }
    }
  })
  return detected
}
