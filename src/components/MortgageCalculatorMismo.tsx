"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

type ArmType = "None" | "3/1" | "5/1";

export default function MortgageCalculatorMismo() {
  // ===== Theme =====
  const [accentColor, setAccentColor] = useState<string>("#4f46e5");
  const [lightMode, setLightMode] = useState<boolean>(false);
  const hiddenColorInput = useRef<HTMLInputElement | null>(null);

  // ===== Inputs =====
  const [borrowerName, setBorrowerName] = useState("");
  const [goal, setGoal] = useState("");
  const [loanType, setLoanType] = useState("Conventional");
  const [appraisedValue, setAppraisedValue] = useState<number | "">("");
  const [balance, setBalance] = useState<number | "">("");
  const [cashOut, setCashOut] = useState<number | "">("");
  const [monthlyEscrow, setMonthlyEscrow] = useState<number | "">("");
  const [escrowMonths, setEscrowMonths] = useState<number | "">(2);

  // Debt consolidation
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
  const [bankFee, setBankFee] = useState<number | "">("");
  const [titleFee, setTitleFee] = useState<number | "">("");
  const [isFundingFeeExempt, setIsFundingFeeExempt] = useState(false);
  const [mortgageInsuranceRate, setMortgageInsuranceRate] = useState(0.006);

  // Temp buydowns (Conventional only)
  const [twoOneBuydown, setTwoOneBuydown] = useState(false);
  const [oneZeroBuydown, setOneZeroBuydown] = useState(false);

  // ARM (FHA/VA only)
  const [armType, setArmType] = useState<ArmType>("None");

  // Borrower View (hide compensation/points % box)
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
  const loanTypeChip = (() => {
    if ((loanType === "FHA" || loanType === "VA" || loanType === "VA IRRRL") && armType !== "None") {
      return `${loanType} ${armType} ARM — ${termLabel}${rateLabel}`;
    }
    const prefix = loanType === "Conventional" ? "Conventional" : loanType;
    return `${prefix} Fixed — ${termLabel}${rateLabel}`;
  })();

  const deriveBgTier = (bgPct: number): "BG1" | "BG2" | "BG3" | "BG4" | "—" => {
    if (bgPct >= 2.25 && bgPct <= 3.0) return "BG1";
    if (bgPct >= 1.5 && bgPct < 2.25) return "BG2";
    if (bgPct >= 0.75 && bgPct < 1.5) return "BG3";
    if (bgPct > 0 && bgPct <= 0.74) return "BG4";
    if (bgPct === 0) return "—";
    return "—";
  };

  const hexToRgba = (hex: string, alpha: number) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return `rgba(79,70,229,${alpha})`;
    const r = parseInt(m[1], 16);
    const g = parseInt(m[2], 16);
    const b = parseInt(m[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const accentBg = (alpha = 0.10) => ({ backgroundColor: hexToRgba(accentColor, alpha), borderColor: hexToRgba(accentColor, 0.35) });
  const accentText = { color: accentColor } as const;

  // ===== Effects =====
  useEffect(() => {
    if (loanType !== "Conventional") {
      setTwoOneBuydown(false);
      setOneZeroBuydown(false);
    }
  }, [loanType]);

  useEffect(() => {
    if (loanType === "VA IRRRL") setCashOut("");
  }, [loanType]);

  useEffect(() => {
    if (bankFee === "") {
      setBankFee(loanType === "VA IRRRL" ? 1500 : 2350);
    }
  }, [loanType, bankFee]);

  useEffect(() => {
    if (!(loanType === "FHA" || loanType === "VA" || loanType === "VA IRRRL")) {
      setArmType("None");
    }
  }, [loanType]);

  // ===== Derived numbers =====
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

  const remainingBalance = (principal: number, ratePct: number, totalYears: number, monthsPaid: number) => {
    const r = Math.max(0, ratePct) / 100 / 12;
    const N = Math.max(1, totalYears * 12);
    const pmt = monthlyPI(ratePct, principal, totalYears);
    const k = Math.min(monthsPaid, N);
    if (r === 0) return principal - pmt * k;
    return principal * Math.pow(1 + r, k) - pmt * ((Math.pow(1 + r, k) - 1) / r);
  };

  // Pre-subsidy preview for Conventional buydown cost
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
  const buydownSubsidyCost = loanType === "Conventional" && (twoOneBuydown || oneZeroBuydown)
    ? diffY1 * 12 + (twoOneBuydown ? diffY2 * 12 : 0)
    : 0;

  const finalLoanAmount = finalLoanPreBuydown + buydownSubsidyCost;

  // Monthly after subsidies financed
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

  // ARM adjusted scenario (+1% first adjustment cap)
  const armYears = armType === "3/1" ? 3 : armType === "5/1" ? 5 : 0;
  const principalAtAdjust = armYears > 0
    ? remainingBalance(finalLoanAmount, n(interestRate), n(termYears), armYears * 12)
    : 0;
  const adjustedRatePct = armYears > 0 ? n(interestRate) + 1 : 0;
  const adjustedPI = armYears > 0
    ? monthlyPI(adjustedRatePct, principalAtAdjust, Math.max(1, n(termYears) - armYears))
    : 0;
  const adjustedMip = loanType === "FHA" && armYears > 0 ? (principalAtAdjust * FHA_ANNUAL_MIP) / 12 : 0;
  const adjustedPITI = armYears > 0 ? adjustedPI + n(monthlyEscrow) + adjustedMip : 0;

  // ===== UI helpers =====
  const textPrimary = lightMode ? "text-slate-900" : "text-slate-100";
  const textSecondary = lightMode ? "text-slate-600" : "text-slate-300";
  const panelCls = `rounded-2xl border shadow-xl p-5 ${lightMode ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"}`;
  const inputCls = `mt-1 border rounded-xl px-3 py-2.5 w-full ${lightMode ? "bg-white border-slate-300 text-slate-900 placeholder-slate-500" : "bg-slate-950 border-slate-700 text-white placeholder-slate-400"}`;
  const selectCls = inputCls;

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className={`text-sm font-semibold tracking-wide uppercase`} style={accentText}>{children}</h3>
  );

  const StatBox = ({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) => (
    <div className={`rounded-2xl border p-3 ${lightMode ? "bg-white" : "bg-slate-900/40"}`} style={accent ? accentBg(0.12) : undefined}>
      <div className={`text-xs ${textSecondary}`} style={accent ? accentText : undefined}>{label}</div>
      <div className={`text-lg font-semibold ${textPrimary}`}>{value}</div>
    </div>
  );

  // ORDERED cost items
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
      items.push({ key: "lenderCost_shifted", node: <StatBox label="Lender Cost" value={`$${fmt(pointsCost)}`} /> });
      items.push({ key: "escrow_shifted", node: <StatBox label="Escrow Prepaid" value={`$${fmt(escrowCost)}`} /> });
    }

    items.push({ key: "bankUnd", node: <StatBox label="Underwriting" value={`$${fmt(n(bankFee))}`} /> });
    items.push({ key: "titleFee", node: <StatBox label="Title Fee" value={`$${fmt(n(titleFee))}`} /> });

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
    <div className={lightMode ? "" : "dark"}>
      <div className={`min-h-dvh ${lightMode ? "bg-white" : "bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"}`}>
        {/* Top bar with logo on TOP-LEFT */}
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-4" style={{ color: lightMode ? undefined : "#e5e7eb" }}>
          <div className="flex items-center gap-3">
            <Image
              src="/mortgage-calc-logo.png"
              alt="Ultimate Mortgage Calculator"
              width={190}
              height={54}
              priority
              className="select-none"
            />
          </div>

          {/* Right-side theme controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => hiddenColorInput.current?.click()}
              className={`rounded-xl border px-3 py-2 text-sm flex items-center gap-2 ${lightMode ? "border-slate-300" : "border-slate-700"}`}
              title="Pick accent color"
            >
              <span className="inline-block h-4 w-4 rounded" style={{ backgroundColor: accentColor }} />
              <span className={lightMode ? "text-slate-600" : "text-slate-300"}>Theme Color</span>
            </button>
            <input ref={hiddenColorInput} type="color" className="hidden" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />

            <label className={`flex items-center gap-2 ${lightMode ? "text-slate-600" : "text-slate-300"}`}>
              <input type="checkbox" checked={lightMode} onChange={(e) => setLightMode(e.target.checked)} />
              <span>Light Mode</span>
            </label>
          </div>
        </div>

        {/* Content grid */}
        <main className="mx-auto max-w-7xl px-4 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ===== Left: Inputs ===== */}
          <section className={panelCls}>
            {/* Alerts */}
            <div className="space-y-2">
              {pointsTooHigh && (
                <div className={`rounded-xl border p-3 ${lightMode ? "border-red-300 bg-red-50 text-red-700" : "border-red-500/30 bg-red-500/10 text-red-200"}`}>
                  <h4 className="font-semibold">Total points exceed 4.75%</h4>
                  <p className="text-xs mt-1">Reduce Cost From Lender or Branch Gen so combined ≤ 4.75%.</p>
                </div>
              )}

              {loanType === "FHA" && fhaLtvImpossible && (
                <div className={`rounded-xl border p-3 ${lightMode ? "border-red-300 bg-red-50 text-red-700" : "border-red-500/30 bg-red-500/10 text-red-200"}`}>
                  <h4 className="font-semibold">FHA LTV exceeds 80%</h4>
                  <p className="text-xs mt-1">This scenario isn’t possible under FHA guidelines.</p>
                </div>
              )}

              {loanType === "Conventional" && convRateTermOver96 && (
                <div className={`rounded-xl border p-3 ${lightMode ? "border-red-300 bg-red-50 text-red-700" : "border-red-500/30 bg-red-500/10 text-red-200"}`}>
                  <h4 className="font-semibold">Rate/Term over 96% LTV</h4>
                  <p className="text-xs mt-1">Conventional R/T isn’t allowed above 96% LTV.</p>
                </div>
              )}

              {loanType === "Conventional" && convCashoutOver80 && (
                <div className={`rounded-xl border p-3 ${lightMode ? "border-red-300 bg-red-50 text-red-700" : "border-red-500/30 bg-red-500/10 text-red-200"}`}>
                  <h4 className="font-semibold">Cash-Out over 80% LTV</h4>
                  <p className="text-xs mt-1">Conventional cash-out isn’t allowed above 80% LTV.</p>
                </div>
              )}

              {loanType === "Conventional" && convMiWarning && !convCashoutOver80 && (
                <div className={`rounded-xl border p-3 ${lightMode ? "border-amber-300 bg-amber-50 text-amber-800" : "border-amber-500/30 bg-amber-500/10 text-amber-100"}`}>
                  <h4 className="font-semibold">Conventional LTV over 80%</h4>
                  <p className="text-xs mt-1">MI will be added. Cash-out not permitted above 80% LTV.</p>
                </div>
              )}
            </div>

            {/* Borrower & loan inputs */}
            <div>
              <label className={textSecondary}>Borrower Name</label>
              <input className={inputCls} type="text" value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} />
            </div>

            <div>
              <label className={textSecondary}>Borrower Goal</label>
              <input className={inputCls} type="text" value={goal} onChange={(e) => setGoal(e.target.value)} />
            </div>

            <div>
              <label className={textSecondary}>Previous Monthly PITI ($/mo)</label>
              <input className={inputCls} type="number" value={currentPITI}
                onChange={(e) => setCurrentPITI(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1">
                <label className={textSecondary}>Loan Type</label>
                <select className={selectCls} value={loanType} onChange={(e) => setLoanType(e.target.value)}>
                  <option value="Conventional">Conventional</option>
                  <option value="VA">VA</option>
                  <option value="FHA">FHA</option>
                  <option value="VA IRRRL">VA IRRRL</option>
                </select>
              </div>
              {(loanType === "VA" || loanType === "VA IRRRL") && (
                <div className="flex items-center h-10 mt-1">
                  <input id="chk-exempt" type="checkbox" checked={isFundingFeeExempt} onChange={(e) => setIsFundingFeeExempt(e.target.checked)} />
                  <label htmlFor="chk-exempt" className={`ml-2 ${textSecondary}`}>Exempt from Funding Fee</label>
                </div>
              )}
            </div>

            <div>
              <label className={textSecondary}>Appraised Value ($)</label>
              <input className={inputCls} type="number" value={appraisedValue}
                onChange={(e) => setAppraisedValue(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>

            <div>
              <label className={textSecondary}>Current Loan Balance ($)</label>
              <input className={inputCls} type="number" value={balance}
                onChange={(e) => setBalance(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>

            {loanType !== "VA IRRRL" && (
              <div>
                <label className={textSecondary}>Cash Out ($)</label>
                <input className={inputCls} type="number" value={cashOut}
                  onChange={(e) => setCashOut(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
            )}

            <div>
              <label className={textSecondary}>Monthly Escrow ($)</label>
              <input className={inputCls} type="number" value={monthlyEscrow}
                onChange={(e) => setMonthlyEscrow(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>

            <div>
              <label className={textSecondary}>Escrow Months</label>
              <input className={inputCls} type="number" value={escrowMonths}
                onChange={(e) => setEscrowMonths(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>

            <div>
              <label className={textSecondary}>Underwriting (Bank) ($)</label>
              <input className={inputCls} type="number" value={bankFee}
                onChange={(e) => setBankFee(e.target.value === "" ? "" : Number(e.target.value))} />
              <p className="text-xs mt-1" style={accentText}>Defaults: $2350 (all) / $1500 (VA IRRRL)</p>
            </div>

            <div>
              <label className={textSecondary}>Title Fee ($)</label>
              <input className={inputCls} type="number" value={titleFee}
                onChange={(e) => setTitleFee(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>

            {/* Debt Consolidation */}
            {effectiveCashOut > 0 && (
              <div className={`rounded-2xl border p-3 mt-2 space-y-2 ${lightMode ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-700"}`}>
                <label className={`font-semibold ${textPrimary}`}>Debt Consolidation (optional)</label>
                <div>
                  <label className={textSecondary}>Debt Being Paid Off ($)</label>
                  <input className={inputCls} type="number" value={debtPaid}
                    onChange={(e) => setDebtPaid(e.target.value === "" ? "" : Number(e.target.value))} />
                </div>
                <div>
                  <label className={textSecondary}>Current Monthly Payments on That Debt ($/mo)</label>
                  <input className={inputCls} type="number" value={debtMonthly}
                    onChange={(e) => setDebtMonthly(e.target.value === "" ? "" : Number(e.target.value))} />
                </div>
              </div>
            )}

            <div>
              <label className={textSecondary}>Cost From Lender(%)</label>
              <input className={inputCls} type="number" step="0.01" value={uwmPoints}
                onChange={(e) => setUwmPoints(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>

            <div>
              <label className={textSecondary}>Branch Gen (BG %)</label>
              <input className={inputCls} type="number" step="0.01" value={branchGenPointsInput}
                onChange={(e) => setBranchGenPointsInput(e.target.value === "" ? "" : Number(e.target.value))} />
              <div className={`text-xs mt-1 ${textSecondary}`}>BG1: 2.25–3.00 • BG2: 1.50–2.25 • BG3: 0.75–1.50 • BG4: 0.74 and below</div>
              <div className="text-xs mt-1" style={{ color: lightMode ? "#b45309" : "#fde68a" }}>
                Heads up: using bare-minimum points to hit a BG tier might cause you to slip into a lower BG due to a cost fail.
              </div>
              <div className="mt-3 flex justify-end items-center gap-2">
                <label htmlFor="toggle-borrower" className={`text-xs ${textSecondary}`}>Borrower View</label>
                <input id="toggle-borrower" type="checkbox" checked={borrowerView} onChange={(e) => setBorrowerView(e.target.checked)} />
              </div>
            </div>

            <div>
              <label className={textSecondary}>Interest Rate (%)</label>
              <input className={inputCls} type="number" step="0.001" value={interestRate}
                onChange={(e) => setInterestRate(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>

            <div>
              <label className={textSecondary}>Term (Years)</label>
              <input className={inputCls} type="number" value={termYears}
                onChange={(e) => setTermYears(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>

            {loanType === "Conventional" && ltv > 80 && (
              <div>
                <label className={textSecondary}>Mortgage Insurance Rate (Annual %)</label>
                <input className={inputCls} type="number" step="0.001"
                  value={(mortgageInsuranceRate * 100).toFixed(3)}
                  onChange={(e) => setMortgageInsuranceRate(Number(e.target.value) / 100)} />
              </div>
            )}

            {/* Product Options: Conventional buydowns vs FHA/VA ARMs */}
            {loanType === "Conventional" ? (
              <div className="mt-2 space-y-2">
                <label className={`font-semibold ${textPrimary}`}>Temporary Buydown (Conventional only)</label>
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <label htmlFor="switch-21" className={`text-sm ${twoOneDisabled ? "opacity-50" : textSecondary}`}>2/1 Buydown</label>
                    <input
                      id="switch-21"
                      type="checkbox"
                      disabled={twoOneDisabled}
                      checked={twoOneBuydown && !twoOneDisabled}
                      onChange={(e) => {
                        const v = e.target.checked;
                        if (!twoOneDisabled) {
                          setTwoOneBuydown(v);
                          if (v) setOneZeroBuydown(false);
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label htmlFor="switch-10" className={`text-sm ${oneZeroDisabled ? "opacity-50" : textSecondary}`}>1/0 Buydown</label>
                    <input
                      id="switch-10"
                      type="checkbox"
                      disabled={oneZeroDisabled}
                      checked={oneZeroBuydown && !oneZeroDisabled}
                      onChange={(e) => {
                        const v = e.target.checked;
                        if (!oneZeroDisabled) {
                          setOneZeroBuydown(v);
                          if (v) setTwoOneBuydown(false);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <label className={`font-semibold ${textPrimary}`}>ARM Options ({loanType})</label>
                <div className="flex items-center gap-8">
                  <label className={`flex items-center gap-2 ${textSecondary}`}>
                    <input type="checkbox" checked={armType === "3/1"} onChange={(e) => setArmType(e.target.checked ? "3/1" : (armType === "3/1" ? "None" : armType))} />
                    <span>3/1 ARM</span>
                  </label>
                  <label className={`flex items-center gap-2 ${textSecondary}`}>
                    <input type="checkbox" checked={armType === "5/1"} onChange={(e) => setArmType(e.target.checked ? "5/1" : (armType === "5/1" ? "None" : armType))} />
                    <span>5/1 ARM</span>
                  </label>
                </div>
                <p className={`text-xs ${textSecondary}`}>Selecting an ARM shows an additional breakdown section on the right.</p>
              </div>
            )}
          </section>

          {/* ===== Right: Results (ONE PAGE) ===== */}
          <section className={`${panelCls} flex flex-col gap-5 relative`}>
            {/* Loan type chip */}
            <div className={`rounded-2xl border p-3`} style={{ ...accentBg(0.08) }}>
              <div className={`text-xs uppercase tracking-wide`} style={accentText}>Loan Type</div>
              <div className={`text-lg font-semibold ${textPrimary}`}>{loanTypeChip}</div>
            </div>

            {(borrowerName || goal) && (
              <div className={`rounded-2xl border p-3 ${lightMode ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"}`}>
                <h3 className={`font-semibold ${textPrimary}`}>{borrowerName ? `${borrowerName}'s Goal` : "Borrower Goal"}</h3>
                <p className={`${textSecondary} text-sm`}>{goal || "—"}</p>
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
                <p className={`text-xs ${textSecondary}`}>Year 1 diff: ${fmt(diffY1)}{twoOneBuydown ? ` • Year 2 diff: $${fmt(diffY2)}` : ""}</p>
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

            {/* Inline ARM Breakdown */}
            {armType !== "None" && (
              <div className="space-y-3">
                <SectionTitle>ARM Breakdown</SectionTitle>
                <p className={`text-sm ${textSecondary}`}>
                  Illustration assumes a max <span style={accentText}>+1.00%</span> first adjustment after {armYears} years.
                  This is a <strong>2-step plan</strong>: enjoy the lower start rate now, then refinance before the adjustment period in {armYears} years.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <StatBox label="PITI at Start Rate" value={`$${fmt(basePITI)}`} />
                  <StatBox label={`PITI if +1% at Year ${armYears}`} value={`$${fmt(adjustedPITI)}`} accent />
                  <StatBox label={`Remaining Principal at Year ${armYears}`} value={`$${fmt(principalAtAdjust)}`} />
                  <StatBox label="Adjusted Principal & Interest" value={`$${fmt(adjustedPI)}`} />
                </div>
                <p className={`text-xs ${textSecondary}`}>Taxes/insurance assumed unchanged.</p>
              </div>
            )}

            {/* ===== Right Column Footer (logo locked; © left; NMLS under logo; Prepared right) ===== */}
            <div className="mt-6 pt-5 border-t border-slate-700/40">
              {/* Borrower View footer only */}
              <div className={borrowerView ? "grid grid-cols-3 items-end" : "hidden"}>
                <div className="flex flex-col items-center justify-end">
                  <div className="h-[46px] w-[130px] flex items-center justify-center">
                    <Image
                      src={lightMode ? "/Extreme-Loans-Logo-Color.png" : "/Extreme-Loans-Logo-White.webp"}
                      alt="Extreme Loans"
                      width={130}
                      height={46}
                      className="opacity-90"
                      priority
                    />
                  </div>
                  <div className="text-[11px] leading-tight text-slate-300 mt-1">
                    NMLS: #2025962
                  </div>
                </div>
                <div className="text-xs text-slate-300 text-right">
                  Prepared September 8, 2025
                </div>
              </div>

              {/* Non-borrower footer (center logo only) */}
              <div className={borrowerView ? "hidden" : "flex justify-center py-5"}>
                <Image
                  src={lightMode ? "/Extreme-Loans-Logo-Color.png" : "/Extreme-Loans-Logo-White.webp"}
                  alt="Extreme Loans Logo"
                  width={240}
                  height={86}
                  className="opacity-90"
                  priority
                />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
