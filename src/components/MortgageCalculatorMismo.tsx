"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Ultimate Mortgage Calculator — Fresh Recode (Sep 4, 2025)
 *
 * Change in this version:
 * - ✅ Added an explicit check/toggle for "Cash‑out with NO debt consolidation".
 *   When enabled, the Debt Consolidation inputs are hidden and ALL cash‑out
 *   is treated as Cash to Borrower. A gentle warning appears if cash‑out is
 *   present but no consolidation details are entered and the toggle isn't set.
 *
 * Other recent features retained from prior recode:
 * - ⚠️ Points disclaimer block (keep total points ≤ 4.75%; avoid bare‑minimum BG).
 * - 🔼 Debt Consolidation section above Compensation in the output.
 * - 🪖 VA IRRRL: Cash‑out input removed (and ignored in math).
 */

export default function MortgageCalculator() {
  // ===== Inputs =====
  const [goal, setGoal] = useState<string>("");
  const [loanType, setLoanType] = useState("Conventional");
  const [appraisedValue, setAppraisedValue] = useState<number | "">("");
  const [balance, setBalance] = useState<number | "">("");
  const [cashOut, setCashOut] = useState<number | "">("");
  const [monthlyEscrow, setMonthlyEscrow] = useState<number | "">("");
  const [escrowMonths, setEscrowMonths] = useState<number | "">(2);

  // Debt consolidation & current PITI (to estimate accurate savings)
  const [debtPaid, setDebtPaid] = useState<number | "">("");
  const [debtMonthly, setDebtMonthly] = useState<number | "">("");
  const [currentPITI, setCurrentPITI] = useState<number | "">("");

  // NEW: Treat cash‑out as pure cash to borrower (no debt consolidation)
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
  const FHA_ANNUAL_MIP      = 0.0055;  // 0.55%/yr (rough default)
  const TOTAL_POINTS_CAP    = 4.75;    // %

  // ===== Utilities =====
  const n = (v: number | string | "") => {
    if (v === "" || v === undefined || v === null) return 0;
    const num = typeof v === "string" ? Number(v) : v;
    return isFinite(Number(num)) ? Number(num) : 0;
  };
  const fmt = (num: number) => num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Infer BG Tier from BG % input
  const deriveBgTier = (bgPct: number): "BG1" | "BG2" | "BG3" | "BG4" | "—" => {
    if (bgPct >= 2.25 && bgPct <= 3.0) return "BG1";
    if (bgPct >= 1.5 && bgPct < 2.25) return "BG2";
    if (bgPct >= 0.75 && bgPct < 1.5) return "BG3";
    if (bgPct <= 0.74 && bgPct > 0) return "BG4";
    if (bgPct === 0) return "—";
    return "—";
  };

  // ===== Effects =====
  // Adjust typical bank fee for VA IRRRL
  useEffect(() => {
    if (loanType === "VA IRRRL" && n(bankFee) === 2350) setBankFee(1500);
    if (loanType !== "VA IRRRL" && n(bankFee) === 1500) setBankFee(2350);
  }, [loanType]);

  // Disable temp buydowns for non‑Conventional
  useEffect(() => {
    if (loanType !== "Conventional") { setTwoOneBuydown(false); setOneZeroBuydown(false); }
  }, [loanType]);

  // If user switches to VA IRRRL: clear and ignore cash‑out
  useEffect(() => {
    if (loanType === "VA IRRRL") setCashOut("");
  }, [loanType]);

  // If there is no cash‑out (or switching programs), clear the pureCashOut toggle
  useEffect(() => {
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

  const uwmPts = n(uwmPoints);
  const bgPts  = n(branchGenPointsInput);
  const totalPointsEntered = uwmPts + bgPts;
  const totalPointsForCalc = Math.min(totalPointsEntered, TOTAL_POINTS_CAP);
  const pointsWereCapped   = totalPointsEntered > TOTAL_POINTS_CAP;
  const pointsCost = baseLoanWithGovFee * (totalPointsForCalc / 100);

  const baseTotalCostsNoBuydown = n(bankFee) + n(titleFee) + escrowCost + pointsCost + fundingFee + ufmip;
  const finalLoanPreBuydown = n(balance) + effectiveCashOut + baseTotalCostsNoBuydown;

  const monthlyPI = (annualRatePct: number, principal: number, termYearsLocal: number) => {
    const r = Math.max(0, annualRatePct) / 100 / 12;
    const nper = Math.max(1, termYearsLocal * 12);
    if (r === 0) return principal / nper;
    return (principal * r) / (1 - Math.pow(1 + r, -nper));
  };

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
  const basePITI = PI + n(monthlyEscrow) + mipMonthly + miMonthly;

  // Debt Consolidation calcs
  const isConsolidating = effectiveCashOut > 0 && !pureCashOut && (n(debtPaid) > 0 || n(debtMonthly) > 0);
  const debtPaidApplied = isConsolidating ? Math.min(effectiveCashOut, n(debtPaid)) : 0;
  const cashToBorrower = isConsolidating ? Math.max(0, effectiveCashOut - debtPaidApplied) : effectiveCashOut;
  const addedMonthlyPIFromDebt = isConsolidating ? monthlyPI(n(interestRate), debtPaidApplied, n(termYears)) : 0;
  const monthlySavingsFromConsolidation = isConsolidating ? Math.max(0, n(debtMonthly) - addedMonthlyPIFromDebt) : 0;

  // New: total monthly savings using current PITI + current debt payments when consolidating
  const currentAllInMonthly = n(currentPITI) + (isConsolidating ? n(debtMonthly) : 0);
  const estimatedTotalMonthlySavings = Math.max(0, currentAllInMonthly - basePITI);

  const showTempBuydown = loanType === "Conventional" && (twoOneBuydown || oneZeroBuydown);
  const y1RatePct = twoOneBuydown ? n(interestRate) - 2 : oneZeroBuydown ? n(interestRate) - 1 : n(interestRate);
  const y2RatePct = twoOneBuydown ? n(interestRate) - 1 : n(interestRate);
  const y1PI = monthlyPI(y1RatePct, finalLoanAmount, n(termYears));
  const y2PI = monthlyPI(y2RatePct, finalLoanAmount, n(termYears));
  const y1PITI = y1PI + n(monthlyEscrow) + mipMonthly + miMonthly;
  const y2PITI = y2PI + n(monthlyEscrow) + mipMonthly + miMonthly;

  const inferredBgTier = deriveBgTier(bgPts);
  const loCompBps = LO_COMP_BPS[inferredBgTier] ?? 0;
  const loaCompBps = LOA_COMP_BPS[inferredBgTier] ?? 0;
  const loCompensation  = finalLoanAmount * (loCompBps / 10000);
  const loaCompensation = finalLoanAmount * (loaCompBps / 10000);

  const feeLabel = loanType === "FHA" ? "UFMIP" : "Funding Fee";
  const feeAmount = loanType === "FHA" ? ufmip : fundingFee;

  const twoOneDisabled = loanType === "Conventional" && effectiveCashOut > 0;
  const oneZeroDisabled = loanType === "Conventional" && effectiveCashOut > 0;

  // Gentle warning helper when user entered cash‑out but no consolidation details and didn't toggle pureCashOut
  const showCashOutNoConsolWarning = effectiveCashOut > 0 && !pureCashOut && n(debtPaid) === 0 && n(debtMonthly) === 0;

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* ===== Inputs ===== */}
      <Card className="shadow-lg rounded-2xl p-4">
        <CardContent className="space-y-4">
          <h2 className="text-xl font-bold">Mortgage Calculator</h2>

          {/* Borrower Goal */}
          <div>
            <Label>Borrower Goal</Label>
            <Input type="text" placeholder="e.g., Lower payment & pay off cards" value={goal} onChange={(e) => setGoal(e.target.value)} />
          </div>

          {/* Loan Type + VA Exempt */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Loan Type</Label>
              <select className="border rounded p-2 w-full" value={loanType} onChange={(e) => setLoanType(e.target.value)}>
                <option value="Conventional">Conventional</option>
                <option value="VA">VA</option>
                <option value="FHA">FHA</option>
                <option value="VA IRRRL">VA IRRRL</option>
              </select>
            </div>
            {(loanType === "VA" || loanType === "VA IRRRL") && (
              <div className="flex items-center">
                <Checkbox checked={isFundingFeeExempt} onCheckedChange={(v) => setIsFundingFeeExempt(!!v)} />
                <Label className="ml-2">Exempt from Funding Fee</Label>
              </div>
            )}
          </div>

          {/* Appraised Value */}
          <div>
            <Label>Appraised Value ($)</Label>
            <Input type="number" value={appraisedValue} onChange={(e) => setAppraisedValue(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>

          {/* Current Loan Balance */}
          <div>
            <Label>Current Loan Balance ($)</Label>
            <Input type="number" value={balance} onChange={(e) => setBalance(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>

          {/* Cash Out — hidden for VA IRRRL */}
          {loanType !== "VA IRRRL" && (
            <div>
              <Label>Cash Out ($)</Label>
              <Input type="number" value={cashOut} onChange={(e) => setCashOut(e.target.value === "" ? "" : Number(e.target.value))} />
              {/* NEW: Pure cash‑out toggle */}
              {n(cashOut) > 0 && (
                <div className="mt-2 flex items-center">
                  <Checkbox checked={pureCashOut} onCheckedChange={(v) => setPureCashOut(!!v)} />
                  <span className="ml-2 text-sm">Not consolidating debt (treat all cash‑out as Cash to Borrower)</span>
                </div>
              )}
            </div>
          )}

          {/* Monthly Escrow */}
          <div>
            <Label>Monthly Escrow ($)</Label>
            <Input type="number" value={monthlyEscrow} onChange={(e) => setMonthlyEscrow(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>

          {/* Escrow Months */}
          <div>
            <Label>Escrow Months</Label>
            <Input type="number" value={escrowMonths} onChange={(e) => setEscrowMonths(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>

          {/* Underwriting / Bank Fee */}
          <div>
            <Label>Underwriting / Bank Fee ($)</Label>
            <Input type="number" value={bankFee} onChange={(e) => setBankFee(e.target.value === "" ? "" : Number(e.target.value))} />
            <p className="text-xs text-gray-600 mt-1">Defaults to $2350 (or $1500 for VA IRRRL). Adjust as needed.</p>
          </div>

          {/* Title Fee */}
          <div>
            <Label>Title Fee ($)</Label>
            <Input type="number" value={titleFee} onChange={(e) => setTitleFee(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>

          {/* Warning when cash‑out present but no consolidation details and toggle not set */}
          {showCashOutNoConsolWarning && (
            <div className="mt-2 rounded-xl border p-3 bg-amber-50 text-amber-800">
              <h4 className="font-semibold">Cash‑out entered without consolidation details</h4>
              <p className="text-xs mt-1">If this cash‑out is <strong>not</strong> for paying off debts, please enable “Not consolidating debt” above. Otherwise, add the debt amounts below so we can estimate true monthly savings.</p>
            </div>
          )}

          {/* Debt Consolidation (shown only when cash‑out and NOT pure cash‑out) */}
          {effectiveCashOut > 0 && !pureCashOut && (
            <div className="rounded-xl border p-3 mt-2 space-y-2">
              <Label className="font-semibold">Debt Consolidation</Label>
              <div>
                <Label>Current PITI ($/mo)</Label>
                <Input type="number" value={currentPITI} onChange={(e) => setCurrentPITI(e.target.value === "" ? "" : Number(e.target.value))} />
                <p className="text-xs text-gray-600 mt-1">Used with your current monthly debt payments to estimate total monthly savings.</p>
              </div>
              <div>
                <Label>Total Debt Being Paid Off ($)</Label>
                <Input type="number" value={debtPaid} onChange={(e) => setDebtPaid(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div>
                <Label>Current Monthly Payments on That Debt ($/mo)</Label>
                <Input type="number" value={debtMonthly} onChange={(e) => setDebtMonthly(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
            </div>
          )}

          {/* Cost on UWM */}
          <div>
            <Label>Rate Cost from Lender (%)</Label>
            <Input type="number" step="0.01" value={uwmPoints} onChange={(e) => setUwmPoints(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>

          {/* Branch Gen */}
          <div>
            <Label>Branch Gen (BG %) — free input</Label>
            <Input type="number" step="0.01" value={branchGenPointsInput} onChange={(e) => setBranchGenPointsInput(e.target.value === "" ? "" : Number(e.target.value))} />
            <div className="text-xs text-gray-600 mt-1">
              <div>BG1: 2.25–3.00 • BG2: 1.50–2.25 • BG3: 0.75–1.50 • BG4: 0.74 and below</div>
              <div className="mt-1">Inferred Tier: <span className="font-semibold">{deriveBgTier(n(branchGenPointsInput))}</span></div>
            </div>
          </div>

          {/* ⚠️ Points & BG Disclaimer */}
          <div className="mt-2 rounded-xl border p-3 bg-amber-50 text-amber-800">
            <h4 className="font-semibold">Points & BG Disclaimer</h4>
            <p className="text-xs mt-1">Do not exceed <strong>4.75%</strong> total points (Rate Cost from Lender + Branch Gen). Exceeding this may cause a backend cost fail. Also, avoid using the bare minimum BG tier — if a cost fail occurs, you could slip from <strong>BG1</strong> to <strong>BG2</strong>, impacting compensation and pricing.</p>
          </div>

          {/* Interest Rate */}
          <div>
            <Label>Interest Rate (%) <span className="text-xs text-gray-500">(This is the NEW rate chosen on the rate sheet)</span></Label>
            <Input type="number" step="0.001" value={interestRate} onChange={(e) => setInterestRate(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>

          {/* Term */}
          <div>
            <Label>Term (Years)</Label>
            <Input type="number" value={termYears} onChange={(e) => setTermYears(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>

          {/* Conv MI Rate shown only when needed */}
          {loanType === "Conventional" && ltv > 80 && (
            <div>
              <Label>Mortgage Insurance Rate (Annual %)</Label>
              <Input type="number" step="0.001" value={(mortgageInsuranceRate * 100).toFixed(3)} onChange={(e) => setMortgageInsuranceRate(Number(e.target.value) / 100)} />
            </div>
          )}

          {/* Temporary Buydown (Conventional only) */}
          {loanType === "Conventional" && (
            <div className="mt-2 space-y-2">
              <Label className="font-semibold">Temporary Buydown (Conventional only)</Label>
              <div className="flex items-center gap-6">
                <div className="flex items-center">
                  <Checkbox disabled={twoOneDisabled} checked={twoOneBuydown && !twoOneDisabled} onCheckedChange={(v) => { if (!twoOneDisabled) { setTwoOneBuydown(!!v); if (v) setOneZeroBuydown(false); } }} />
                  <span className={`ml-2 ${twoOneDisabled ? "text-gray-400" : ""}`}>2/1 Buydown (Y1 -2%, Y2 -1%)</span>
                </div>
                <div className="flex items-center">
                  <Checkbox disabled={oneZeroDisabled} checked={oneZeroBuydown && !oneZeroDisabled} onCheckedChange={(v) => { if (!oneZeroDisabled) { setOneZeroBuydown(!!v); if (v) setTwoOneBuydown(false); } }} />
                  <span className={`ml-2 ${oneZeroDisabled ? "text-gray-400" : ""}`}>1/0 Buydown (Y1 -1%)</span>
                </div>
              </div>
              {(twoOneDisabled || oneZeroDisabled) && (<p className="text-xs text-amber-600">2/1 and 1/0 buydowns are disabled when Cash Out &gt; 0.</p>)}
              <p className="text-xs text-gray-600">Subsidy cost is estimated using the pre‑subsidy financed amount and then financed into the loan.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Results ===== */}
      <Card className="shadow-lg rounded-2xl p-4">
        <CardContent className="space-y-4">
          <h2 className="text-xl font-bold">Results</h2>

          {goal && (
            <div className="rounded-xl bg-slate-50 border p-3">
              <h3 className="font-semibold">Borrower Goal</h3>
              <p className="text-sm">{goal}</p>
            </div>
          )}

          <div className="space-y-1">
            <h3 className="font-semibold">Loan & Cost Breakdown</h3>
            <p><strong>Base Loan (Before Points):</strong> ${fmt(baseLoanWithGovFee)}</p>
            <p><strong>{feeLabel}:</strong> ${fmt(feeAmount)}</p>
            <p><strong>Total Points Used:</strong> {totalPointsForCalc.toFixed(2)}% {pointsWereCapped && <span className="text-red-600">(capped)</span>}</p>
            <p><strong>Points Cost:</strong> ${fmt(pointsCost)}</p>
            <p><strong>Escrow Prepaid:</strong> ${fmt(escrowCost)}</p>
            <p><strong>Underwriting (Bank + Title):</strong> ${fmt(n(bankFee) + n(titleFee))}</p>
            {showTempBuydown && (
              <>
                <p><strong>Temp Buydown Subsidy (financed):</strong> ${fmt(buydownSubsidyCost)}</p>
                <p className="text-xs text-gray-500">Year 1 diff: ${fmt(diffY1)}{twoOneBuydown ? ` • Year 2 diff: $${fmt(diffY2)}` : ""}</p>
              </>
            )}
            <p><strong>Total Costs:</strong> ${fmt(baseTotalCostsNoBuydown + buydownSubsidyCost)}</p>
            <p><strong>Final Loan Amount:</strong> ${fmt(finalLoanAmount)}</p>
            {n(appraisedValue) > 0 && <p><strong>LTV:</strong> {ltv.toFixed(2)}%</p>}
          </div>

          <div className="space-y-1">
            <h3 className="font-semibold">Monthly PITI Breakdown</h3>
            <p><strong>Principal & Interest:</strong> ${fmt(PI)}</p>
            <p><strong>Escrow:</strong> ${fmt(n(monthlyEscrow))}</p>
            {loanType === "FHA" && <p><strong>MIP:</strong> ${fmt(mipMonthly)}</p>}
            {loanType === "Conventional" && ltv > 80 && <p><strong>Mortgage Insurance:</strong> ${fmt(miMonthly)}</p>}
            <p className="text-lg font-bold text-green-600"><strong>Total Monthly Payment (New PITI):</strong> ${fmt(basePITI)}</p>
          </div>

          {showTempBuydown && (
            <div className="space-y-1">
              <h3 className="font-semibold">Temporary Buydown Preview</h3>
              {twoOneBuydown && (
                <>
                  <p><strong>Year 1 PITI (Rate {Math.max(0, y1RatePct).toFixed(3)}%):</strong> ${fmt(y1PITI)}</p>
                  <p><strong>Year 2 PITI (Rate {Math.max(0, y2RatePct).toFixed(3)}%):</strong> ${fmt(y2PITI)}</p>
                  <p><strong>Final PITI (Rate {n(interestRate).toFixed(3)}%):</strong> ${fmt(basePITI)}</p>
                </>
              )}
              {oneZeroBuydown && (
                <>
                  <p><strong>Year 1 PITI (Rate {Math.max(0, y1RatePct).toFixed(3)}%):</strong> ${fmt(y1PITI)}</p>
                  <p><strong>Final PITI (Rate {n(interestRate).toFixed(3)}%):</strong> ${fmt(basePITI)}</p>
                </>
              )}
            </div>
          )}

          {/* 🔼 Debt Consolidation Summary ABOVE Compensation (when consolidating) */}
          {isConsolidating && (
            <div className="space-y-1 mt-3">
              <h3 className="font-semibold">Debt Consolidation Summary</h3>
              <p><strong>Current PITI:</strong> ${fmt(n(currentPITI))}/mo</p>
              <p><strong>They currently pay on their debt:</strong> ${fmt(n(debtMonthly))}/mo</p>
              <p><strong>Debt Being Paid Off:</strong> ${fmt(debtPaidApplied)}</p>
              <p><strong>Cash to Borrower After Debts:</strong> ${fmt(cashToBorrower)}</p>
              <p className="text-green-600"><strong>Est. Monthly Savings (Total):</strong> ${fmt(estimatedTotalMonthlySavings)}</p>
              <p className="text-xs text-gray-500">Savings compares your current PITI plus current monthly debt payments versus the new mortgage PITI. (Escrow/MI structure changes are reflected in the new PITI.)</p>
              <p className="text-xs text-gray-500">For reference, PI‑only savings from consolidating the specified debts is estimated at ${fmt(monthlySavingsFromConsolidation)}.</p>
            </div>
          )}

          {/* NEW: Cash‑Out (No Debt Consolidation) Summary */}
          {effectiveCashOut > 0 && !isConsolidating && (
            <div className="space-y-1 mt-3">
              <h3 className="font-semibold">Cash‑Out Summary (No Debt Consolidation)</h3>
              <p><strong>Cash to Borrower:</strong> ${fmt(cashToBorrower)}</p>
              <p className="text-xs text-gray-500">All cash‑out is treated as cash to borrower; debt consolidation fields were not used.</p>
            </div>
          )}

          {/* Compensation */}
          <div className="space-y-1">
            <h3 className="font-semibold">Compensation</h3>
            <p><strong>Inferred BG Tier:</strong> {deriveBgTier(n(branchGenPointsInput))}</p>
            <p><strong>Loan Officer:</strong> {loCompBps} bps → ${fmt(loCompensation)}</p>
            <p><strong>Associate:</strong> {loaCompBps} bps → ${fmt(loaCompensation)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
