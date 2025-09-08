"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Ultimate Mortgage Calculator — FULL RECODE w/ Term in Loan Type (Sep 7, 2025)
 *
 * Fresh file built from scratch per request. Inputs remain unchanged from the prior build.
 * The only UI change: the Loan Type output now appends the term, e.g.,
 * "Conventional — 30 year".
 */

export default function MortgageCalculatorIndigoDark_TermInType() {
  // ===== Inputs =====
  const [borrowerName, setBorrowerName] = useState<string>("");
  const [goal, setGoal] = useState<string>("");
  const [loanType, setLoanType] = useState("Conventional");
  const [appraisedValue, setAppraisedValue] = useState<number | "">("");
  const [balance, setBalance] = useState<number | "">("");
  const [cashOut, setCashOut] = useState<number | "">("");
  const [monthlyEscrow, setMonthlyEscrow] = useState<number | "">("");
  const [escrowMonths, setEscrowMonths] = useState<number | "">(2);

  // Debt consolidation inputs (NO PITI HERE)
  const [debtPaid, setDebtPaid] = useState<number | "">("");
  const [debtMonthly, setDebtMonthly] = useState<number | "">("");

  // Previous PITI — single global input
  const [currentPITI, setCurrentPITI] = useState<number | "">("");

  // Treat cash‑out as pure cash to borrower (no consolidation)
  const [pureCashOut, setPureCashOut] = useState<boolean>(false);

  // Costs & Points
  const [uwmPoints, setUwmPoints] = useState<number | "">("");
  const [branchGenPointsInput, setBranchGenPointsInput] = useState<number | "">("");
  const [interestRate, setInterestRate] = useState<number | "">("");
  const [termYears, setTermYears] = useState<number | "">(30);

  // Fees / toggles
  const [bankFee, setBankFee] = useState<number | "">(2350);
  const [titleFee, setTitleFee] = useState<number | "">("");
  const [isFundingFeeExempt, setIsFundingFeeExempt] = useState(false);
  const [mortgageInsuranceRate, setMortgageInsuranceRate] = useState(0.006);

  // Temporary buydowns (Conventional only)
  const [twoOneBuydown, setTwoOneBuydown] = useState(false);
  const [oneZeroBuydown, setOneZeroBuydown] = useState(false);

  // ===== Constants =====
  const LO_COMP_BPS: Record<string, number> = { BG1: 100, BG2: 75, BG3: 50, BG4: 25 };
  const LOA_COMP_BPS: Record<string, number> = { BG1: 80, BG2: 60, BG3: 50, BG4: 25 };

  const VA_FUNDING_FEE_RATE = 0.033;   // 3.3%
  const VA_IRRRL_FEE_RATE   = 0.005;   // 0.5%
  const FHA_UFMIP_RATE      = 0.0175;  // 1.75%
  const FHA_ANNUAL_MIP      = 0.0055;  // 0.55%/yr (default)
  const TOTAL_POINTS_ALERT  = 4.75;    // Threshold only (no capping)

  // ===== Utilities =====
  const n = (v: number | string | "") => {
    if (v === "" || v === undefined || v === null) return 0;
    const num = typeof v === "string" ? Number(v) : v;
    return isFinite(Number(num)) ? Number(num) : 0;
  };
  const fmt = (num: number) => num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const deriveBgTier = (bgPct: number): "BG1" | "BG2" | "BG3" | "BG4" | "—" => {
    if (bgPct >= 2.25 && bgPct <= 3.0) return "BG1";
    if (bgPct >= 1.5 && bgPct < 2.25) return "BG2";
    if (bgPct >= 0.75 && bgPct < 1.5) return "BG3";
    if (bgPct <= 0.74 && bgPct > 0) return "BG4";
    if (bgPct === 0) return "—";
    return "—";
  };

  // ===== Effects =====
  useEffect(() => {
    // Adjust typical bank fee for VA IRRRL
    if (loanType === "VA IRRRL" && n(bankFee) === 1500) return; // already set
    if (loanType === "VA IRRRL" && n(bankFee) === 2350) setBankFee(1500);
    if (loanType !== "VA IRRRL" && n(bankFee) === 1500) setBankFee(2350);
  }, [loanType]);

  useEffect(() => {
    // Disable temp buydowns for non‑Conventional
    if (loanType !== "Conventional") { setTwoOneBuydown(false); setOneZeroBuydown(false); }
  }, [loanType]);

  useEffect(() => {
    // If user switches to VA IRRRL: clear and ignore cash‑out
    if (loanType === "VA IRRRL") setCashOut("");
  }, [loanType]);

  useEffect(() => {
    // If there is no cash‑out (or switching programs), clear the pureCashOut toggle
    if (loanType === "VA IRRRL" || n(cashOut) === 0) setPureCashOut(false);
  }, [loanType, cashOut]);

  // ===== Derived Values =====
  const escrowCost = useMemo(() => n(monthlyEscrow) * n(escrowMonths), [monthlyEscrow, escrowMonths]);
  const effectiveCashOut = loanType === "VA IRRRL" ? 0 : n(cashOut); // 🚫 No cash‑out for IRRRL
  const baseLoanBeforePoints = n(balance) + n(bankFee) + n(titleFee) + escrowCost + effectiveCashOut;

  const fundingFee = !isFundingFeeExempt
    ? (loanType === "VA" ? baseLoanBeforePoints * VA_FUNDING_FEE_RATE
      : loanType === "VA IRRRL" ? baseLoanBeforePoints * VA_IRRRL_FEE_RATE
      : 0)
    : 0;
  const ufmip = loanType === "FHA" ? baseLoanBeforePoints * FHA_UFMIP_RATE : 0;
  const baseLoanWithGovFee = baseLoanBeforePoints + fundingFee + ufmip;

  // 🔁 No more capping. Just warn if total points exceed 4.75%
  const uwmPts = n(uwmPoints);
  const bgPts  = n(branchGenPointsInput);
  const totalPointsEntered = uwmPts + bgPts;
  const pointsCost = baseLoanWithGovFee * (totalPointsEntered / 100);
  const pointsTooHigh = totalPointsEntered > TOTAL_POINTS_ALERT;

  const baseTotalCostsNoBuydown = n(bankFee) + n(titleFee) + escrowCost + pointsCost + fundingFee + ufmip;
  const finalLoanPreBuydown = n(balance) + effectiveCashOut + baseTotalCostsNoBuydown;

  const monthlyPI = (annualRatePct: number, principal: number, termYearsLocal: number) => {
    const r = Math.max(0, annualRatePct) / 100 / 12;
    const nper = Math.max(1, termYearsLocal * 12);
    if (r === 0) return principal / nper;
    return (principal * r) / (1 - Math.pow(1 + r, -nper));
  };

  // Pre-buydown preview (used for subsidy costing)
  const PI_pre = monthlyPI(n(interestRate), finalLoanPreBuydown, n(termYears));
  const mipMonthly_pre = loanType === "FHA" ? (finalLoanPreBuydown * FHA_ANNUAL_MIP) / 12 : 0;
  const ltv_pre = n(appraisedValue) > 0 ? (finalLoanPreBuydown / n(appraisedValue)) * 100 : 0;
  const miMonthly_pre = loanType === "Conventional" && ltv_pre > 80 ? (finalLoanPreBuydown * n(mortgageInsuranceRate)) / 12 : 0;
  const basePITI_pre = PI_pre + n(monthlyEscrow) + mipMonthly_pre + miMonthly_pre;

  const y1RatePct_pre = (loanType === "Conventional" && (twoOneBuydown || oneZeroBuydown)) ? (twoOneBuydown ? n(interestRate) - 2 : n(interestRate) - 1) : n(interestRate);
  const y2RatePct_pre = (loanType === "Conventional" && twoOneBuydown) ? n(interestRate) - 1 : n(interestRate);
  const y1PI_pre = monthlyPI(y1RatePct_pre, finalLoanPreBuydown, n(termYears));
  const y2PI_pre = monthlyPI(y2RatePct_pre, finalLoanPreBuydown, n(termYears));
  const y1PITI_pre = y1PI_pre + n(monthlyEscrow) + mipMonthly_pre + miMonthly_pre;
  const y2PITI_pre = y2PI_pre + n(monthlyEscrow) + mipMonthly_pre + miMonthly_pre;

  const diffY1 = Math.max(0, basePITI_pre - y1PITI_pre);
  const diffY2 = twoOneBuydown ? Math.max(0, basePITI_pre - y2PITI_pre) : 0;
  const buydownSubsidyCost = (loanType === "Conventional")
    ? (oneZeroBuydown || twoOneBuydown)
      ? (diffY1 * 12 + (twoOneBuydown ? diffY2 * 12 : 0))
      : 0
    : 0;

  const finalLoanAmount = finalLoanPreBuydown + buydownSubsidyCost;

  const PI = monthlyPI(n(interestRate), finalLoanAmount, n(termYears));
  const mipMonthly = loanType === "FHA" ? (finalLoanAmount * FHA_ANNUAL_MIP) / 12 : 0;
  const ltv = n(appraisedValue) > 0 ? (finalLoanAmount / n(appraisedValue)) * 100 : 0;
  const miMonthly = loanType === "Conventional" && ltv > 80 ? (finalLoanAmount * n(mortgageInsuranceRate)) / 12 : 0;
  const basePITI = PI + n(monthlyEscrow) + mipMonthly + miMonthly; // NEW Monthly PITI

  // Debt Consolidation conditions
  const isConsolidating = effectiveCashOut > 0 && !pureCashOut && (n(debtPaid) > 0 || n(debtMonthly) > 0);
  const debtPaidApplied = isConsolidating ? Math.min(effectiveCashOut, n(debtPaid)) : 0;
  const cashToBorrower = isConsolidating ? Math.max(0, effectiveCashOut - debtPaidApplied) : effectiveCashOut;

  // Savings calcs vs Previous — GLOBAL (no PI-only savings shown)
  const prevPITI = n(currentPITI);
  const savingsVsPrev = Math.max(0, prevPITI - basePITI);

  // Debt Consolidation savings: (Prev PITI + previous monthly debt payments) − NEW PITI
  const dcTotalPrevOutflow = isConsolidating ? prevPITI + n(debtMonthly) : 0;
  const dcMonthlySavings = isConsolidating ? Math.max(0, dcTotalPrevOutflow - basePITI) : 0;

  const showTempBuydown = loanType === "Conventional" && (twoOneBuydown || oneZeroBuydown);
  const y1RatePct = twoOneBuydown ? n(interestRate) - 2 : oneZeroBuydown ? n(interestRate) - 1 : n(interestRate);
  const y2RatePct = twoOneBuydown ? n(interestRate) - 1 : n(interestRate);
  const y1PI = monthlyPI(y1RatePct, finalLoanAmount, n(termYears));
  const y2PI = monthlyPI(y2RatePct, finalLoanAmount, n(termYears));
  const y1PITI = y1PI + n(monthlyEscrow) + mipMonthly + miMonthly;
  const y2PITI = y2PI + n(monthlyEscrow) + mipMonthly + miMonthly;
  const savingsY1VsPrev = Math.max(0, prevPITI - y1PITI);
  const savingsY2VsPrev = Math.max(0, prevPITI - y2PITI);

  const inferredBgTier = deriveBgTier(n(branchGenPointsInput));
  const loCompBps = LO_COMP_BPS[inferredBgTier] ?? 0;
  const loaCompBps = LOA_COMP_BPS[inferredBgTier] ?? 0;
  const loCompensation  = finalLoanAmount * (loCompBps / 10000);
  const loaCompensation = finalLoanAmount * (loaCompBps / 10000);

  const feeLabel = loanType === "FHA" ? "UFMIP" : "Funding Fee";
  const feeAmount = loanType === "FHA" ? ufmip : fundingFee;

  const twoOneDisabled = loanType === "Conventional" && effectiveCashOut > 0;
  const oneZeroDisabled = loanType === "Conventional" && effectiveCashOut > 0;

  const showCashOutNoConsolWarning = effectiveCashOut > 0 && !pureCashOut && n(debtPaid) === 0 && n(debtMonthly) === 0;

  // ===== Program/LTV warnings =====
  const fhaLtvImpossible = loanType === "FHA" && ltv > 80;
  const convMiWarning    = loanType === "Conventional" && ltv > 80; // MI will apply
  const convCashoutOver80 = loanType === "Conventional" && effectiveCashOut > 0 && ltv > 80; // cash-out not allowed
  const convRateTermOver96 = loanType === "Conventional" && effectiveCashOut === 0 && ltv > 96; // rate/term over 96 not allowed

  // ===== UI helpers =====
  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-sm font-semibold tracking-wide uppercase text-indigo-400">{children}</h3>
  );

  const StatBox = ({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) => (
    <div className={`rounded-2xl border p-3 ${accent ? "bg-indigo-500/10 border-indigo-500/40" : "bg-slate-900/40 border-slate-700"}`}>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );

  const WarningsBlock = () => (
    <div className="space-y-2">
      {pointsTooHigh && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200">
          <h4 className="font-semibold">Total points exceed 4.75%</h4>
          <p className="text-xs mt-1">Reduce Cost on UWM or Branch Gen to ≤ 4.75% combined or you may trigger a backend cost fail.</p>
        </div>
      )}

      {loanType === "FHA" && fhaLtvImpossible && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200">
          <h4 className="font-semibold">FHA LTV exceeds 80%</h4>
          <p className="text-xs mt-1">This scenario is not possible under FHA guidelines.</p>
        </div>
      )}
      {loanType === "Conventional" && convRateTermOver96 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200">
          <h4 className="font-semibold">Conventional Rate/Term over 96% LTV</h4>
          <p className="text-xs mt-1">We can’t do Rate & Term refinances above 96% LTV.</p>
        </div>
      )}
      {loanType === "Conventional" && convCashoutOver80 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200">
          <h4 className="font-semibold">Conventional Cash‑Out over 80% LTV</h4>
          <p className="text-xs mt-1">Cash‑out is not allowed above 80% LTV for Conventional loans.</p>
        </div>
      )}
      {loanType === "Conventional" && convMiWarning && !convCashoutOver80 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100">
          <h4 className="font-semibold">Conventional LTV over 80%</h4>
          <p className="text-xs mt-1">Mortgage Insurance (MI) will be added. Cash‑out is not permitted above 80% LTV.</p>
        </div>
      )}

      {showCashOutNoConsolWarning && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100">
          <h4 className="font-semibold">Cash‑out entered without consolidation details</h4>
          <p className="text-xs mt-1">If this cash‑out is <strong>not</strong> for paying off debts, enable “Not consolidating debt.” Otherwise, add debt amounts so we can estimate true monthly savings.</p>
        </div>
      )}

      {(twoOneDisabled || oneZeroDisabled) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100">
          <h4 className="font-semibold">Temporary buydown disabled</h4>
          <p className="text-xs mt-1">2/1 and 1/0 buydowns are disabled when Cash Out &gt; 0.</p>
        </div>
      )}

      <div className="rounded-xl border border-slate-600 bg-slate-800/60 p-3 text-slate-200">
        <h4 className="font-semibold">Points & BG Guidance</h4>
        <p className="text-xs mt-1">Keep total points (Cost on UWM + Branch Gen) ≤ <strong>4.75%</strong> to avoid backend cost fails. Avoid the bare minimum BG tier; if a cost fail occurs, you could slip from <strong>BG1</strong> to <strong>BG2</strong>, impacting compensation and pricing.</p>
      </div>
    </div>
  );

  const inputCls = "mt-1 bg-slate-950 border-slate-700 text-white placeholder-slate-400";
  const selectCls = "mt-1 border rounded-xl p-2.5 w-full bg-slate-950 border-slate-700 text-white";

  // helper to format the term label ("30 year" vs "15 year")
  const termLabel = `${n(termYears)} year`;

  return (
    <div className="dark">
      <div className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        {/* Simple Title (no banner) */}
        <div className="mx-auto max-w-7xl px-4 py-4">
          <h1 className="text-xl font-semibold tracking-tight">Ultimate Mortgage Calculator</h1>
        </div>

        {/* Content */}
        <main className="mx-auto max-w-7xl px-4 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ===== Inputs (warnings pinned to top) ===== */}
          <Card className="rounded-2xl border-slate-800 bg-slate-900/60 shadow-xl">
            <CardContent className="space-y-4 p-5">
              {/* TOP WARNINGS */}
              <WarningsBlock />

              {/* Borrower Name */}
              <div>
                <Label className="text-slate-300">Borrower Name</Label>
                <Input className={inputCls} type="text" placeholder="e.g., Jane Doe" value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} />
              </div>

              {/* Borrower Goal */}
              <div>
                <Label className="text-slate-300">Borrower Goal</Label>
                <Input className={inputCls} type="text" placeholder="e.g., Lower payment & pay off cards" value={goal} onChange={(e) => setGoal(e.target.value)} />
              </div>

              {/* Previous PITI (GLOBAL) */}
              <div>
                <Label className="text-slate-300">Previous Monthly PITI ($/mo)</Label>
                <Input className={inputCls} type="number" value={currentPITI} onChange={(e) => setCurrentPITI(e.target.value === "" ? "" : Number(e.target.value))} />
                <p className="text-xs text-slate-400 mt-1">Used to compare savings vs the new payment, plus Year 1/2 buydown savings when applicable.</p>
              </div>

              {/* Loan Type + VA Exempt */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="flex-1">
                  <Label className="text-slate-300">Loan Type</Label>
                  <select className={selectCls} value={loanType} onChange={(e) => setLoanType(e.target.value)}>
                    <option value="Conventional">Conventional</option>
                    <option value="VA">VA</option>
                    <option value="FHA">FHA</option>
                    <option value="VA IRRRL">VA IRRRL</option>
                  </select>
                </div>
                {(loanType === "VA" || loanType === "VA IRRRL") && (
                  <div className="flex items-center h-10 mt-1">
                    <Checkbox checked={isFundingFeeExempt} onCheckedChange={(v) => setIsFundingFeeExempt(!!v)} />
                    <Label className="ml-2 text-slate-300">Exempt from Funding Fee</Label>
                  </div>
                )}
              </div>

              {/* Appraised Value */}
              <div>
                <Label className="text-slate-300">Appraised Value ($)</Label>
                <Input className={inputCls} type="number" value={appraisedValue} onChange={(e) => setAppraisedValue(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>

              {/* Current Loan Balance */}
              <div>
                <Label className="text-slate-300">Current Loan Balance ($)</Label>
                <Input className={inputCls} type="number" value={balance} onChange={(e) => setBalance(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>

              {/* Cash Out — hidden for VA IRRRL */}
              {loanType !== "VA IRRRL" && (
                <div>
                  <Label className="text-slate-300">Cash Out ($)</Label>
                  <Input className={inputCls} type="number" value={cashOut} onChange={(e) => setCashOut(e.target.value === "" ? "" : Number(e.target.value))} />
                  {n(cashOut) > 0 && (
                    <div className="mt-2 flex items-center">
                      <Checkbox checked={pureCashOut} onCheckedChange={(v) => setPureCashOut(!!v)} />
                      <span className="ml-2 text-sm text-slate-300">Not consolidating debt (treat all cash‑out as Cash to Borrower)</span>
                    </div>
                  )}
                </div>
              )}

              {/* Monthly Escrow */}
              <div>
                <Label className="text-slate-300">Monthly Escrow ($)</Label>
                <Input className={inputCls} type="number" value={monthlyEscrow} onChange={(e) => setMonthlyEscrow(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>

              {/* Escrow Months */}
              <div>
                <Label className="text-slate-300">Escrow Months</Label>
                <Input className={inputCls} type="number" value={escrowMonths} onChange={(e) => setEscrowMonths(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>

              {/* Underwriting / Bank Fee */}
              <div>
                <Label className="text-slate-300">Underwriting / Bank Fee ($)</Label>
                <Input className={inputCls} type="number" value={bankFee} onChange={(e) => setBankFee(e.target.value === "" ? "" : Number(e.target.value))} />
                <p className="text-xs text-slate-400 mt-1">Defaults to $2350 (or $1500 for VA IRRRL). Adjust as needed.</p>
              </div>

              {/* Title Fee */}
              <div>
                <Label className="text-slate-300">Title Fee ($)</Label>
                <Input className={inputCls} type="number" value={titleFee} onChange={(e) => setTitleFee(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>

              {/* Debt Consolidation (only when cash‑out and NOT pure cash‑out) */}
              {effectiveCashOut > 0 && !pureCashOut && (
                <div className="rounded-2xl border border-slate-700 p-3 mt-2 space-y-2 bg-slate-900/60">
                  <Label className="font-semibold text-slate-200">Debt Consolidation</Label>
                  <div>
                    <Label className="text-slate-300">Total Debt Being Paid Off ($)</Label>
                    <Input className={inputCls} type="number" value={debtPaid} onChange={(e) => setDebtPaid(e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
                  <div>
                    <Label className="text-slate-300">Current Monthly Payments on That Debt ($/mo)</Label>
                    <Input className={inputCls} type="number" value={debtMonthly} onChange={(e) => setDebtMonthly(e.target.value === "" ? "" : Number(e.target.value))} />
                    <p className="text-xs text-slate-400 mt-1">Savings compare (Prev PITI + these monthly payments) vs the new PITI.</p>
                  </div>
                </div>
              )}

              {/* Cost on UWM */}
              <div>
                <Label className="text-slate-300">Cost on UWM (%)</Label>
                <Input className={inputCls} type="number" step="0.01" value={uwmPoints} onChange={(e) => setUwmPoints(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>

              {/* Branch Gen */}
              <div>
                <Label className="text-slate-300">Branch Gen (BG %) — free input</Label>
                <Input className={inputCls} type="number" step="0.01" value={branchGenPointsInput} onChange={(e) => setBranchGenPointsInput(e.target.value === "" ? "" : Number(e.target.value))} />
                <div className="text-xs text-slate-400 mt-1">
                  <div>BG1: 2.25–3.00 • BG2: 1.50–2.25 • BG3: 0.75–1.50 • BG4: 0.74 and below</div>
                  <div className="mt-1">Inferred Tier: <span className="font-semibold text-slate-200">{deriveBgTier(n(branchGenPointsInput))}</span></div>
                </div>
              </div>

              {/* Interest Rate */}
              <div>
                <Label className="text-slate-300">Interest Rate (%) <span className="text-xs text-slate-400">(NEW rate chosen on rate sheet)</span></Label>
                <Input className={inputCls} type="number" step="0.001" value={interestRate} onChange={(e) => setInterestRate(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>

              {/* Term */}
              <div>
                <Label className="text-slate-300">Term (Years)</Label>
                <Input className={inputCls} type="number" value={termYears} onChange={(e) => setTermYears(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>

              {/* Conv MI Rate shown only when needed */}
              {loanType === "Conventional" && ltv > 80 && (
                <div>
                  <Label className="text-slate-300">Mortgage Insurance Rate (Annual %)</Label>
                  <Input className={inputCls} type="number" step="0.001" value={(mortgageInsuranceRate * 100).toFixed(3)} onChange={(e) => setMortgageInsuranceRate(Number(e.target.value) / 100)} />
                </div>
              )}

              {/* Temporary Buydown (Conventional only) */}
              {loanType === "Conventional" && (
                <div className="mt-2 space-y-2">
                  <Label className="font-semibold text-slate-200">Temporary Buydown (Conventional only)</Label>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center">
                      <Checkbox disabled={twoOneDisabled} checked={twoOneBuydown && !twoOneDisabled} onCheckedChange={(v) => { if (!twoOneDisabled) { setTwoOneBuydown(!!v); if (v) setOneZeroBuydown(false); } }} />
                      <span className={`ml-2 text-sm ${twoOneDisabled ? "text-slate-500" : "text-slate-300"}`}>2/1 Buydown (Y1 -2%, Y2 -1%)</span>
                    </div>
                    <div className="flex items-center">
                      <Checkbox disabled={oneZeroDisabled} checked={oneZeroBuydown && !oneZeroDisabled} onCheckedChange={(v) => { if (!oneZeroDisabled) { setOneZeroBuydown(!!v); if (v) setTwoOneBuydown(false); } }} />
                      <span className={`ml-2 text-sm ${oneZeroDisabled ? "text-slate-500" : "text-slate-300"}`}>1/0 Buydown (Y1 -1%)</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">Subsidy cost is estimated using the pre‑subsidy financed amount and then financed into the loan.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===== Results ===== */}
          <Card className="rounded-2xl border-slate-800 bg-slate-900/60 shadow-xl">
            <CardContent className="space-y-5 p-5">
              {/* Loan Type at Top of Output (now includes term) */}
              <div className="rounded-2xl border border-indigo-500/30 p-3 bg-indigo-950/40">
                <div className="text-xs uppercase tracking-wide text-indigo-300">Loan Type</div>
                <div className="text-lg font-semibold text-indigo-100">{loanType} — {termLabel}</div>
              </div>

              {(borrowerName || goal) && (
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3">
                  <h3 className="font-semibold text-slate-200">{borrowerName ? `${borrowerName}'s Goal` : "Borrower Goal"}</h3>
                  <p className="text-sm text-slate-300">{goal || "—"}</p>
                </div>
              )}

              <div className="space-y-3">
                <SectionTitle>Loan & Cost Breakdown</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  <StatBox label="Base Loan (Before Points)" value={`$${fmt(baseLoanWithGovFee)}`} accent />
                  {loanType !== "Conventional" && n(feeAmount) > 0 && (
                    <StatBox label={feeLabel} value={`$${fmt(feeAmount)}`} />
                  )}
                  <StatBox label="Total Points Entered" value={`${totalPointsEntered.toFixed(2)}%`} />
                  <StatBox label="Points Cost" value={`$${fmt(pointsCost)}`} />
                  <StatBox label="Escrow Prepaid" value={`$${fmt(escrowCost)}`} />
                  <StatBox label="UW (Bank + Title)" value={`$${fmt(n(bankFee) + n(titleFee))}`} />
                  {showTempBuydown && (
                    <StatBox label="Temp Buydown Subsidy (financed)" value={`$${fmt(buydownSubsidyCost)}`} />
                  )}
                  <StatBox label="Total Costs" value={`$${fmt(baseTotalCostsNoBuydown + buydownSubsidyCost)}`} />
                  <StatBox label="Final Loan Amount" value={`$${fmt(finalLoanAmount)}`} accent />
                  {n(appraisedValue) > 0 && <StatBox label="LTV" value={`${ltv.toFixed(2)}%`} />}
                </div>
                {showTempBuydown && (
                  <p className="text-xs text-slate-400">Year 1 diff: ${fmt(diffY1)}{twoOneBuydown ? ` • Year 2 diff: $${fmt(diffY2)}` : ""}</p>
                )}
              </div>

              <div className="space-y-3">
                <SectionTitle>Monthly PITI Breakdown</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  <StatBox label="Principal & Interest" value={`$${fmt(PI)}`} />
                  <StatBox label="Escrow" value={`$${fmt(n(monthlyEscrow))}`} />
                  {loanType === "FHA" && <StatBox label="MIP" value={`$${fmt(mipMonthly)}`} />}
                  {loanType === "Conventional" && ltv > 80 && <StatBox label="Mortgage Insurance" value={`$${fmt(miMonthly)}`} />}
                  <StatBox label="Total Monthly Payment (New PITI)" value={`$${fmt(basePITI)}`} accent />
                </div>
              </div>

              <div className="space-y-3">
                <SectionTitle>Savings vs Previous</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  <StatBox label="Previous PITI" value={`$${fmt(prevPITI)}`} />
                  <StatBox label="Monthly Savings (Base vs Previous)" value={`$${fmt(savingsVsPrev)}`} accent />
                </div>
                {showTempBuydown && (
                  <div className="grid grid-cols-2 gap-3">
                    {twoOneBuydown && (
                      <>
                        <StatBox label="Year 1 PITI (vs Prev)" value={`$${fmt(y1PITI)} · saves $${fmt(savingsY1VsPrev)}`} />
                        <StatBox label="Year 2 PITI (vs Prev)" value={`$${fmt(y2PITI)} · saves $${fmt(savingsY2VsPrev)}`} />
                      </>
                    )}
                    {oneZeroBuydown && (
                      <StatBox label="Year 1 PITI (vs Prev)" value={`$${fmt(y1PITI)} · saves $${fmt(savingsY1VsPrev)}`} />
                    )}
                  </div>
                )}
              </div>

              {isConsolidating && (
                <div className="space-y-3">
                  <SectionTitle>Debt Consolidation Summary</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <StatBox label="They currently pay on their debt" value={`$${fmt(n(debtMonthly))}/mo`} />
                    <StatBox label="Debt Being Paid Off" value={`$${fmt(debtPaidApplied)}`} />
                    <StatBox label="Cash to Borrower After Debts" value={`$${fmt(cashToBorrower)}`} />
                    <StatBox label="Total Previous Outflow" value={`$${fmt(dcTotalPrevOutflow)}`} />
                    <StatBox label="Total Monthly Savings vs NEW PITI" value={`$${fmt(dcMonthlySavings)}`} accent />
                  </div>
                  <p className="text-xs text-slate-400">Savings = (Previous PITI + previous monthly debt payments) − NEW PITI. PI-only savings are intentionally NOT shown.</p>
                </div>
              )}

              {effectiveCashOut > 0 && !isConsolidating && (
                <div className="space-y-3">
                  <SectionTitle>Cash‑Out Summary (No Debt Consolidation)</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <StatBox label="Cash to Borrower" value={`$${fmt(cashToBorrower)}`} accent />
                  </div>
                  <p className="text-xs text-slate-400">All cash‑out is treated as cash to borrower; debt consolidation fields were not used.</p>
                </div>
              )}

              <div className="space-y-3">
                <SectionTitle>Compensation</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  <StatBox label="Inferred BG Tier" value={`${deriveBgTier(n(branchGenPointsInput))}`} />
                  <StatBox label="Loan Officer" value={`${loCompBps} bps → $${fmt(loCompensation)}`} />
                  <StatBox label="Associate" value={`${loaCompBps} bps → $${fmt(loaCompensation)}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </main>

      </div>
    </div>
  );
}




