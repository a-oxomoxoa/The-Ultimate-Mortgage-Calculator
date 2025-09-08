"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import Image from "next/image";

/**
 * Ultimate Mortgage Calculator — Final Recode v5
 *
 * Changes from v4 (per Tim):
 * - Removed the automatic defaults for Underwriting to $2350 / $1500 (VA IRRRL). Field now starts blank and never auto-switches.
 * - Added a yellowish warning under the Branch Gen breakdown about potential cost fail when using bare-minimum points to hit a BG tier.
 *
 * Kept from v4:
 * - "Borrower View" hides compensation and the Base Loan (Before Points).
 * - Header shows Loan Type — Term — Interest Rate.
 * - Buydown controls are Switches; disabled for non-Conventional or when cash-out present (as coded below).
 */

// Tailwind theme map
const INDIGO_THEME: Record<string, {
  sectionTitleText: string;
  headerWrap: string;
  accentBoxWrap: string;
  accentTitleText: string;
}> = {
  "300": {
    sectionTitleText: "text-indigo-300",
    headerWrap: "border-indigo-300/40 bg-indigo-950/40 text-indigo-100",
    accentBoxWrap: "bg-indigo-300/10 border-indigo-300/40",
    accentTitleText: "text-indigo-300",
  },
  "400": {
    sectionTitleText: "text-indigo-400",
    headerWrap: "border-indigo-400/40 bg-indigo-950/40 text-indigo-100",
    accentBoxWrap: "bg-indigo-400/10 border-indigo-400/40",
    accentTitleText: "text-indigo-400",
  },
  "500": {
    sectionTitleText: "text-indigo-500",
    headerWrap: "border-indigo-500/40 bg-indigo-950/40 text-indigo-100",
    accentBoxWrap: "bg-indigo-500/10 border-indigo-500/40",
    accentTitleText: "text-indigo-500",
  },
  "600": {
    sectionTitleText: "text-indigo-600",
    headerWrap: "border-indigo-600/40 bg-indigo-950/40 text-indigo-100",
    accentBoxWrap: "bg-indigo-600/10 border-indigo-600/40",
    accentTitleText: "text-indigo-600",
  },
};

export default function MortgageCalculator_Final_v5() {
  // ===== Theme =====
  const [indigoShade, setIndigoShade] = useState<"300" | "400" | "500" | "600">("500");
  const t = INDIGO_THEME[indigoShade];

  // ===== Inputs =====
  const [borrowerName, setBorrowerName] = useState("");
  const [goal, setGoal] = useState("");
  const [loanType, setLoanType] = useState("Conventional");
  const [appraisedValue, setAppraisedValue] = useState<number | "">("");
  const [balance, setBalance] = useState<number | "">("");
  const [cashOut, setCashOut] = useState<number | "">("");
  const [monthlyEscrow, setMonthlyEscrow] = useState<number | "">("");
  const [escrowMonths, setEscrowMonths] = useState<number | "">(2);

  // Debt consolidation (implicit via values)
  const [debtPaid, setDebtPaid] = useState<number | "">("");
  const [debtMonthly, setDebtMonthly] = useState<number | "">("");

  // Previous PITI
  const [currentPITI, setCurrentPITI] = useState<number | "">("");

  // Pricing
  const [uwmPoints, setUwmPoints] = useState<number | "">("");
  const [branchGenPointsInput, setBranchGenPointsInput] = useState<number | "">("");
  const [interestRate, setInterestRate] = useState<number | "">("");
  const [termYears, setTermYears] = useState<number | "">(30);

  // Fees
  // NOTE: start blank and never auto-default based on loan type
  const [bankFee, setBankFee] = useState<number | "">("");
  const [titleFee, setTitleFee] = useState<number | "">("");
  const [isFundingFeeExempt, setIsFundingFeeExempt] = useState(false);
  const [mortgageInsuranceRate, setMortgageInsuranceRate] = useState(0.006);

  // Buydowns (Switches)
  const [twoOneBuydown, setTwoOneBuydown] = useState(false);
  const [oneZeroBuydown, setOneZeroBuydown] = useState(false);

  // Borrower View (replaces Hide Compensation). TRUE = hide compensation.
  const [borrowerView, setBorrowerView] = useState(false);

  // ===== Constants =====
  const LO_COMP_BPS: Record<string, number> = { BG1: 100, BG2: 75, BG3: 50, BG4: 25 };
  const LOA_COMP_BPS: Record<string, number> = { BG1: 80, BG2: 60, BG3: 50, BG4: 25 };

  const VA_FUNDING_FEE_RATE = 0.033;
  const VA_IRRRL_FEE_RATE = 0.005;
  const FHA_UFMIP_RATE = 0.0175;
  const FHA_ANNUAL_MIP = 0.0055;
  const TOTAL_POINTS_ALERT = 4.75;

  // ===== Utils =====
  const n = (v: number | string | "") => (v === "" || v === undefined || v === null ? 0 : Number(v));
  const fmt = (num: number) => num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const termLabel = `${n(termYears)} year`;
  const rateLabel = interestRate === "" ? "" : ` — ${Number(interestRate).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')}%`;

  const deriveBgTier = (bgPct: number): "BG1" | "BG2" | "BG3" | "BG4" | "—" => {
    if (bgPct >= 2.25 && bgPct <= 3.0) return "BG1";
    if (bgPct >= 1.5 && bgPct < 2.25) return "BG2";
    if (bgPct >= 0.75 && bgPct < 1.5) return "BG3";
    if (bgPct > 0 && bgPct <= 0.74) return "BG4";
    if (bgPct === 0) return "—";
    return "—";
  };

  // ===== Effects =====
  // NOTE: removed the effect that auto-switched Underwriting between $2350 and $1500 for VA IRRRL.

  useEffect(() => {
    // Disable buydowns if not Conventional
    if (loanType !== "Conventional") {
      setTwoOneBuydown(false);
      setOneZeroBuydown(false);
    }
  }, [loanType]);

  useEffect(() => {
    // No cash-out for IRRRL
    if (loanType === "VA IRRRL") setCashOut("");
  }, [loanType]);

  // ===== Derived =====
  const escrowCost = useMemo(() => n(monthlyEscrow) * n(escrowMonths), [monthlyEscrow, escrowMonths]);
  const effectiveCashOut = loanType === "VA IRRRL" ? 0 : n(cashOut);
  const baseLoanBeforePoints = n(balance) + n(bankFee) + n(titleFee) + escrowCost + effectiveCashOut;

  const fundingFee = !isFundingFeeExempt
    ? (loanType === "VA" ? baseLoanBeforePoints * VA_FUNDING_FEE_RATE
      : loanType === "VA IRRRL" ? baseLoanBeforePoints * VA_IRRRL_FEE_RATE
      : 0)
    : 0;
  const ufmip = loanType === "FHA" ? baseLoanBeforePoints * FHA_UFMIP_RATE : 0;
  const baseLoanWithGovFee = baseLoanBeforePoints + fundingFee + ufmip;

  const uwmPts = n(uwmPoints);
  const bgPts = n(branchGenPointsInput);
  const totalPointsEntered = uwmPts + bgPts;
  const pointsCost = baseLoanWithGovFee * (totalPointsEntered / 100);
  const pointsTooHigh = totalPointsEntered > TOTAL_POINTS_ALERT;

  const baseTotalCostsNoBuydown = n(bankFee) + n(titleFee) + escrowCost + pointsCost + fundingFee + ufmip;
  const finalLoanPreBuydown = n(balance) + effectiveCashOut + baseTotalCostsNoBuydown;

  const monthlyPI = (aprPct: number, principal: number, termYearsLocal: number) => {
    const r = Math.max(0, aprPct) / 100 / 12;
    const nper = Math.max(1, termYearsLocal * 12);
    if (r === 0) return principal / nper;
    return (principal * r) / (1 - Math.pow(1 + r, -nper));
  };

  // Pre-subsidy preview for buydown cost
  const PI_pre = monthlyPI(n(interestRate), finalLoanPreBuydown, n(termYears));
  const mipMonthly_pre = loanType === "FHA" ? (finalLoanPreBuydown * FHA_ANNUAL_MIP) / 12 : 0;
  const ltv_pre = n(appraisedValue) > 0 ? (finalLoanPreBuydown / n(appraisedValue)) * 100 : 0;
  const miMonthly_pre = loanType === "Conventional" && ltv_pre > 80 ? (finalLoanPreBuydown * n(mortgageInsuranceRate)) / 12 : 0;
  const basePITI_pre = PI_pre + n(monthlyEscrow) + mipMonthly_pre + miMonthly_pre;

  const twoOneDisabled = loanType === "Conventional" && effectiveCashOut > 0;
  const oneZeroDisabled = loanType === "Conventional" && effectiveCashOut > 0;
  const y1RatePct_pre = (loanType === "Conventional" && (twoOneBuydown || oneZeroBuydown))
    ? (twoOneBuydown ? n(interestRate) - 2 : n(interestRate) - 1) : n(interestRate);
  const y2RatePct_pre = (loanType === "Conventional" && twoOneBuydown) ? n(interestRate) - 1 : n(interestRate);
  const y1PI_pre = monthlyPI(y1RatePct_pre, finalLoanPreBuydown, n(termYears));
  const y2PI_pre = monthlyPI(y2RatePct_pre, finalLoanPreBuydown, n(termYears));
  const y1PITI_pre = y1PI_pre + n(monthlyEscrow) + mipMonthly_pre + miMonthly_pre;
  const y2PITI_pre = y2PI_pre + n(monthlyEscrow) + mipMonthly_pre + miMonthly_pre;
  const diffY1 = Math.max(0, basePITI_pre - y1PITI_pre);
  const diffY2 = twoOneBuydown ? Math.max(0, basePITI_pre - y2PITI_pre) : 0;
  const buydownSubsidyCost =
    loanType === "Conventional" && (twoOneBuydown || oneZeroBuydown)
      ? diffY1 * 12 + (twoOneBuydown ? diffY2 * 12 : 0)
      : 0;

  const finalLoanAmount = finalLoanPreBuydown + buydownSubsidyCost;

  const PI = monthlyPI(n(interestRate), finalLoanAmount, n(termYears));
  const mipMonthly = loanType === "FHA" ? (finalLoanAmount * FHA_ANNUAL_MIP) / 12 : 0;
  const ltv = n(appraisedValue) > 0 ? (finalLoanAmount / n(appraisedValue)) * 100 : 0;
  const miMonthly = loanType === "Conventional" && ltv > 80 ? (finalLoanAmount * n(mortgageInsuranceRate)) / 12 : 0;
  const basePITI = PI + n(monthlyEscrow) + mipMonthly + miMonthly;

  // Debt consolidation
  const isConsolidating = effectiveCashOut > 0 && (n(debtPaid) > 0 || n(debtMonthly) > 0);
  const debtPaidApplied = isConsolidating ? Math.min(effectiveCashOut, n(debtPaid)) : 0;
  const cashToBorrower = isConsolidating ? Math.max(0, effectiveCashOut - debtPaidApplied) : effectiveCashOut;

  // Savings vs previous
  const prevPITI = n(currentPITI);
  const savingsVsPrev = Math.max(0, prevPITI - basePITI);

  // Buydown display (final)
  const showTempBuydown = loanType === "Conventional" && (twoOneBuydown || oneZeroBuydown);
  const y1RatePct = twoOneBuydown ? n(interestRate) - 2 : oneZeroBuydown ? n(interestRate) - 1 : n(interestRate);
  const y2RatePct = twoOneBuydown ? n(interestRate) - 1 : n(interestRate);
  const y1PI = monthlyPI(y1RatePct, finalLoanAmount, n(termYears));
  const y2PI = monthlyPI(y2RatePct, finalLoanAmount, n(termYears));
  const y1PITI = y1PI + n(monthlyEscrow) + mipMonthly + miMonthly;
  const y2PITI = y2PI + n(monthlyEscrow) + mipMonthly + miMonthly;
  const savingsY1VsPrev = Math.max(0, prevPITI - y1PITI);
  const savingsY2VsPrev = Math.max(0, prevPITI - y2PITI);

  // Comp calcs
  const inferredBgTier = deriveBgTier(n(branchGenPointsInput));
  const loCompBps = LO_COMP_BPS[inferredBgTier] ?? 0;
  const loaCompBps = LOA_COMP_BPS[inferredBgTier] ?? 0;
  const loCompensation = finalLoanAmount * (loCompBps / 10000);
  const loaCompensation = finalLoanAmount * (loaCompBps / 10000);

  const feeLabel = loanType === "FHA" ? "UFMIP" : "Funding Fee";
  const feeAmount = loanType === "FHA" ? ufmip : fundingFee;

  const fhaLtvImpossible = loanType === "FHA" && ltv > 80;
  const convMiWarning = loanType === "Conventional" && ltv > 80;
  const convCashoutOver80 = loanType === "Conventional" && effectiveCashOut > 0 && ltv > 80;
  const convRateTermOver96 = loanType === "Conventional" && effectiveCashOut === 0 && ltv > 96;

  // ===== UI helpers =====
  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className={`text-sm font-semibold tracking-wide uppercase ${t.sectionTitleText}`}>{children}</h3>
  );

  const StatBox = ({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) => (
    <div className={`rounded-2xl border p-3 ${accent ? t.accentBoxWrap : "bg-slate-900/40 border-slate-700"}`}>
      <div className={`text-xs ${accent ? t.accentTitleText : "text-slate-400"}`}>{label}</div>
      <div className="text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );

  const inputCls = "mt-1 bg-slate-950 border-slate-700 text-white placeholder-slate-400";
  const selectCls = "mt-1 border rounded-xl p-2.5 w-full bg-slate-950 border-slate-700 text-white";

  // ORDERING for cost breakdown (Base Loan only when Borrower View is OFF)
  const loanCostItemsVisible = (() => {
    const items: Array<{ key: string; node: JSX.Element }> = [];

    if (!borrowerView) {
      items.push({ key: "baseLoan", node: <StatBox label="Base Loan (Before Points)" value={`$${fmt(baseLoanWithGovFee)}`} accent /> });
    }

    if (loanType !== "Conventional" && n(feeAmount) > 0) {
      items.push({ key: "govFee", node: <StatBox label={feeLabel} value={`$${fmt(feeAmount)}`} /> });
    }

    if (!borrowerView) {
      items.push({ key: "totalPoints", node: <StatBox label="Total Points Entered" value={`${(uwmPts + bgPts).toFixed(2)}%`} /> });
      items.push({ key: "lenderCost", node: <StatBox label="Lender Cost" value={`$${fmt(pointsCost)}`} /> });
      items.push({ key: "escrow", node: <StatBox label="Escrow Prepaid" value={`$${fmt(escrowCost)}`} /> });
    } else {
      // Borrower View: still show Lender Cost + Escrow so totals add up, but omit the points % box
      items.push({ key: "lenderCost_shifted", node: <StatBox label="Lender Cost" value={`$${fmt(pointsCost)}`} /> });
      items.push({ key: "escrow_shifted", node: <StatBox label="Escrow Prepaid" value={`$${fmt(escrowCost)}`} /> });
    }

    items.push({ key: "underwriting", node: <StatBox label="Underwriting" value={`$${fmt(n(bankFee) + n(titleFee))}`} /> });

    if (showTempBuydown) {
      items.push({ key: "tempBuydown", node: <StatBox label="Temp Buydown Subsidy (financed)" value={`$${fmt(buydownSubsidyCost)}`} /> });
    }

    items.push({ key: "totalCosts", node: <StatBox label="Total Costs" value={`$${fmt(baseTotalCostsNoBuydown + buydownSubsidyCost)}`} /> });
    items.push({ key: "finalLoan", node: <StatBox label="Final Loan Amount" value={`$${fmt(finalLoanAmount)}`} accent /> });

    if (n(appraisedValue) > 0) {
      items.push({ key: "ltv", node: <StatBox label="LTV" value={`${ltv.toFixed(2)}%`} /> });
    }

    return items;
  })();

  return (
    <div className="dark">
      <div className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        {/* Top bar */}
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Ultimate Mortgage Calculator</h1>

          {/* Theme Picker */}
          <div className="flex items-center gap-2">
            <Label className="text-slate-300">Indigo Shade</Label>
            <select
              className="ml-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
              value={indigoShade}
              onChange={(e) => setIndigoShade(e.target.value as any)}
            >
              <option value="300">300 (lighter)</option>
              <option value="400">400</option>
              <option value="500">500 (default)</option>
              <option value="600">600 (deeper)</option>
            </select>
          </div>
        </div>

        {/* Two-column grid where each column controls its own height */}
        <main className="mx-auto max-w-7xl px-4 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ===== Left: Inputs ===== */}
          <Card className="rounded-2xl border-slate-800 bg-slate-900/60 shadow-xl">
            <CardContent className="space-y-4 p-5">
              {/* Alerts */}
              <div className="space-y-2">
                {totalPointsEntered > TOTAL_POINTS_ALERT && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200">
                    <h4 className="font-semibold">Total points exceed 4.75%</h4>
                    <p className="text-xs mt-1">Reduce Cost From Lender or Branch Gen so combined ≤ 4.75%.</p>
                  </div>
                )}

                {loanType === "FHA" && fhaLtvImpossible && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200">
                    <h4 className="font-semibold">FHA LTV exceeds 80%</h4>
                    <p className="text-xs mt-1">This scenario isn’t possible under FHA guidelines.</p>
                  </div>
                )}

                {loanType === "Conventional" && convRateTermOver96 && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200">
                    <h4 className="font-semibold">Rate/Term over 96% LTV</h4>
                    <p className="text-xs mt-1">Conventional R/T isn’t allowed above 96% LTV.</p>
                  </div>
                )}

                {loanType === "Conventional" && convCashoutOver80 && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200">
                    <h4 className="font-semibold">Cash-Out over 80% LTV</h4>
                    <p className="text-xs mt-1">Conventional cash-out isn’t allowed above 80% LTV.</p>
                  </div>
                )}

                {loanType === "Conventional" && convMiWarning && !convCashoutOver80 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100">
                    <h4 className="font-semibold">Conventional LTV over 80%</h4>
                    <p className="text-xs mt-1">MI will be added. Cash-out not permitted above 80% LTV.</p>
                  </div>
                )}
              </div>

              {/* Borrower & loan inputs */}
              <div>
                <Label className="text-slate-300">Borrower Name</Label>
                <Input className={inputCls} type="text" value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} />
              </div>

              <div>
                <Label className="text-slate-300">Borrower Goal</Label>
                <Input className={inputCls} type="text" value={goal} onChange={(e) => setGoal(e.target.value)} />
              </div>

              <div>
                <Label className="text-slate-300">Previous Monthly PITI ($/mo)</Label>
                <Input className={inputCls} type="number" value={currentPITI}
                  onChange={(e) => setCurrentPITI(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>

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

              <div>
                <Label className="text-slate-300">Appraised Value ($)</Label>
                <Input className={inputCls} type="number" value={appraisedValue}
                  onChange={(e) => setAppraisedValue(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>

              <div>
                <Label className="text-slate-300">Current Loan Balance ($)</Label>
                <Input className={inputCls} type="number" value={balance}
                  onChange={(e) => setBalance(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>

              {loanType !== "VA IRRRL" && (
                <div>
                  <Label className="text-slate-300">Cash Out ($)</Label>
                  <Input className={inputCls} type="number" value={cashOut}
                    onChange={(e) => setCashOut(e.target.value === "" ? "" : Number(e.target.value))} />
                </div>
              )}

              <div>
                <Label className="text-slate-300">Monthly Escrow ($)</Label>
                <Input className={inputCls} type="number" value={monthlyEscrow}
                  onChange={(e) => setMonthlyEscrow(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>

              <div>
                <Label className="text-slate-300">Escrow Months</Label>
                <Input className={inputCls} type="number" value={escrowMonths}
                  onChange={(e) => setEscrowMonths(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>

              <div>
                <Label className="text-slate-300">Underwriting ($)</Label>
                <Input className={inputCls} type="number" value={bankFee}
                  onChange={(e) => setBankFee(e.target.value === "" ? "" : Number(e.target.value))} />
                {/* removed default helper text per request */}
              </div>

              <div>
                <Label className="text-slate-300">Title Fee ($)</Label>
                <Input className={inputCls} type="number" value={titleFee}
                  onChange={(e) => setTitleFee(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>

              {/* Debt Consolidation (optional fields appear only when cash-out present) */}
              {effectiveCashOut > 0 && (
                <div className="rounded-2xl border border-slate-700 p-3 mt-2 space-y-2 bg-slate-900/60">
                  <Label className="font-semibold text-slate-200">Debt Consolidation (optional)</Label>
                  <div>
                    <Label className="text-slate-300">Debt Being Paid Off ($)</Label>
                    <Input className={inputCls} type="number" value={debtPaid}
                      onChange={(e) => setDebtPaid(e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
                  <div>
                    <Label className="text-slate-300">Current Monthly Payments on That Debt ($/mo)</Label>
                    <Input className={inputCls} type="number" value={debtMonthly}
                      onChange={(e) => setDebtMonthly(e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
                </div>
              )}

              <div>
                <Label className="text-slate-300">Cost From Lender(%)</Label>
                <Input className={inputCls} type="number" step="0.01" value={uwmPoints}
                  onChange={(e) => setUwmPoints(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>

              <div>
                <Label className="text-slate-300">Branch Gen (BG %)</Label>
                <Input className={inputCls} type="number" step="0.01" value={branchGenPointsInput}
                  onChange={(e) => setBranchGenPointsInput(e.target.value === "" ? "" : Number(e.target.value))} />
                <div className="text-xs text-slate-400 mt-1">BG1: 2.25–3.00 • BG2: 1.50–2.25 • BG3: 0.75–1.50 • BG4: 0.74 and below</div>
                {/* NEW: subtle yellow warning about using bare-minimum points */}
                <div className="text-xs text-amber-200 mt-1">
                  Heads up: using bare-minimum points to hit a BG tier can cause might cause you slip into a lower BG due to costfail
                </div>
                <div className="mt-3 flex justify-end items-center gap-2">
                  <Label htmlFor="toggle-borrower" className="text-xs text-slate-300">Borrower View</Label>
                  <Switch id="toggle-borrower" checked={borrowerView} onCheckedChange={setBorrowerView} />
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Interest Rate (%)</Label>
                <Input className={inputCls} type="number" step="0.001" value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>

              <div>
                <Label className="text-slate-300">Term (Years)</Label>
                <Input className={inputCls} type="number" value={termYears}
                  onChange={(e) => setTermYears(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>

              {loanType === "Conventional" && ltv > 80 && (
                <div>
                  <Label className="text-slate-300">Mortgage Insurance Rate (Annual %)</Label>
                  <Input className={inputCls} type="number" step="0.001"
                    value={(mortgageInsuranceRate * 100).toFixed(3)}
                    onChange={(e) => setMortgageInsuranceRate(Number(e.target.value) / 100)} />
                </div>
              )}

              {loanType === "Conventional" && (
                <div className="mt-2 space-y-2">
                  <Label className="font-semibold text-slate-200">Temporary Buydown (Conventional only)</Label>
                  <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                      <Label htmlFor="switch-21" className={`text-sm ${twoOneDisabled ? "text-slate-500" : "text-slate-300"}`}>2/1 Buydown</Label>
                      <Switch
                        id="switch-21"
                        disabled={twoOneDisabled}
                        checked={twoOneBuydown && !twoOneDisabled}
                        onCheckedChange={(v) => {
                          if (!twoOneDisabled) {
                            setTwoOneBuydown(!!v);
                            if (v) setOneZeroBuydown(false);
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label htmlFor="switch-10" className={`text-sm ${oneZeroDisabled ? "text-slate-500" : "text-slate-300"}`}>1/0 Buydown</Label>
                      <Switch
                        id="switch-10"
                        disabled={oneZeroDisabled}
                        checked={oneZeroBuydown && !oneZeroDisabled}
                        onCheckedChange={(v) => {
                          if (!oneZeroDisabled) {
                            setOneZeroBuydown(!!v);
                            if (v) setTwoOneBuydown(false);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===== Right: Results ===== */}
          <Card className="self-start rounded-2xl border-slate-800 bg-slate-900/60 shadow-xl flex flex-col">
            <CardContent className="space-y-5 p-5">
              {/* Header chip with loan type, term, and interest rate */}
              <div className={`rounded-2xl border p-3 ${t.headerWrap}`}>
                <div className={`text-xs uppercase tracking-wide ${t.accentTitleText}`}>Loan Type</div>
                <div className="text-lg font-semibold text-indigo-100">{loanType} — {termLabel}{rateLabel}</div>
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
                  {loanCostItemsVisible.map((it) => (
                    <div key={it.key}>{it.node}</div>
                  ))}
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
                    <StatBox label="Total Previous Outflow" value={`$${fmt(prevPITI + n(debtMonthly))}`} />
                    <StatBox label="Total Monthly Savings vs NEW PITI" value={`$${fmt(Math.max(0, prevPITI + n(debtMonthly) - basePITI))}`} accent />
                  </div>
                </div>
              )}

              {effectiveCashOut > 0 && !isConsolidating && (
                <div className="space-y-3">
                  <SectionTitle>Cash-Out Summary</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <StatBox label="Cash to Borrower" value={`$${fmt(cashToBorrower)}`} accent />
                  </div>
                </div>
              )}

              {!borrowerView && (
                <div className="space-y-3">
                  <SectionTitle>Compensation</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <StatBox label="Inferred BG Tier" value={`${deriveBgTier(n(branchGenPointsInput))}`} />
                    <StatBox label="Loan Officer" value={`${loCompBps} bps → $${fmt(loCompensation)}`} />
                    <StatBox label="Associate" value={`${loaCompBps} bps → $${fmt(loaCompensation)}`} />
                  </div>
                </div>
              )}
            </CardContent>

            {/* Footer sits after content; no forced card height so no empty column gap. */}
            <CardFooter className="mt-6 justify-center py-5">
              <Image
                src="/Extreme-Loans-Logo-White.webp"
                alt="Extreme Loans Logo"
                width={220}
                height={80}
                className="opacity-90"
                priority
              />
            </CardFooter>
          </Card>
        </main>
      </div>
    </div>
  );
}
