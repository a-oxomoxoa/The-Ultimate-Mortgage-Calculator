"use client";

import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Eye, DollarSign, Percent, House, Receipt, User, Phone, Mail, Info, UserCircle2 } from "lucide-react";

// ---------- Utils ----------
const currency = (n?: number) =>
  typeof n === "number" && !Number.isNaN(n)
    ? n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 })
    : "—";
const pct = (n?: number) =>
  typeof n === "number" && !Number.isNaN(n)
    ? `${n.toLocaleString(undefined, { maximumFractionDigits: 3 })}%`
    : "—";
const parseNum = (v: string) => {
  const n = Number(v.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

export default function ExtremeLoansPriceOutV6() {
  // ------- Inputs -------
  const [clientName, setClientName] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [rate, setRate] = useState("");
  const [piti, setPiti] = useState("");
  const [cost, setCost] = useState("");

  // Cash out
  const [noCashOut, setNoCashOut] = useState(false);
  const [cashOut, setCashOut] = useState("");
  const [monthlyDebt, setMonthlyDebt] = useState("");
  const [prevPiti, setPrevPiti] = useState("");

  // LO vs LOA toggle
  const [isLOAMode, setIsLOAMode] = useState(false);

  // LO info
  const [officerName, setOfficerName] = useState("");
  const [officerNmls, setOfficerNmls] = useState("");
  const [officerPhone, setOfficerPhone] = useState("");
  const [officerEmail, setOfficerEmail] = useState("");

  // Manager contact (shown in LOA mode)
  const [mgrName, setMgrName] = useState("");
  const [mgrPhone, setMgrPhone] = useState("");
  const [mgrEmail, setMgrEmail] = useState("");

  const [showEdit, setShowEdit] = useState(true);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    []
  );

  const vals = useMemo(
    () => ({
      clientName,
      loanAmount: parseNum(loanAmount),
      rate: parseNum(rate),
      piti: parseNum(piti),
      cost: parseNum(cost),
      noCashOut,
      cashOut: parseNum(cashOut),
      monthlyDebt: parseNum(monthlyDebt),
      previousPiti: parseNum(prevPiti),
      officerName,
      officerNmls,
      officerPhone,
      officerEmail,
      isLOAMode,
      mgrName,
      mgrPhone,
      mgrEmail,
    }),
    [
      clientName,
      loanAmount,
      rate,
      piti,
      cost,
      noCashOut,
      cashOut,
      monthlyDebt,
      prevPiti,
      officerName,
      officerNmls,
      officerPhone,
      officerEmail,
      isLOAMode,
      mgrName,
      mgrPhone,
      mgrEmail,
    ]
  );

  const piIncrease = useMemo(() => {
    if (vals.noCashOut) return undefined;
    if (vals.piti == null || vals.previousPiti == null) return undefined;
    return vals.piti - vals.previousPiti;
  }, [vals.noCashOut, vals.piti, vals.previousPiti]);

  const estMonthlySavings = useMemo(() => {
    if (vals.noCashOut) return undefined;
    if (vals.monthlyDebt == null || piIncrease == null) return undefined;
    return vals.monthlyDebt - piIncrease;
  }, [vals.noCashOut, vals.monthlyDebt, piIncrease]);

  return (
    <div className="min-h-screen w-full text-white relative bg-slate-950">
      {/* Soft glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden print:hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-600/40 blur-3xl" />
        <div className="absolute top-1/4 -right-24 h-96 w-96 rounded-full bg-fuchsia-600/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-cyan-400/30 blur-3xl" />
        <div className="absolute bottom-16 right-1/4 h-72 w-72 rounded-full bg-amber-400/30 blur-3xl" />
      </div>

      {/* Toolbar (PDF export button removed) */}
      <div className="print:hidden sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-slate-900/70 border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold tracking-tight text-lg">Extreme Loans — Price Out</span>
            <div className="flex items-center gap-2 text-xs opacity-80">
              <span>Presentation Mode</span>
              <Switch checked={!showEdit} onCheckedChange={(v) => setShowEdit(!v)} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span>LOA Mode</span>
              <Switch checked={isLOAMode} onCheckedChange={setIsLOAMode} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-5 gap-6 px-4 py-6">
        {/* Editor */}
        <div className={`print:hidden md:col-span-2 ${showEdit ? "block" : "hidden"}`}>
          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur">
            <CardContent className="p-5 space-y-5 text-white">
              <div className="flex items-center gap-2 text-sm opacity-80">
                <Eye className="h-4 w-4" /> Visible only to you
              </div>

              {/* Client */}
              <LabeledInput icon={<User className="h-4 w-4 opacity-70" />} label="Client Name" placeholder="e.g., Jane Homeowner" value={clientName} setValue={setClientName} />

              {/* Pricing */}
              <LabeledInput icon={<DollarSign className="h-4 w-4 opacity-70" />} label="Loan Amount" placeholder="e.g., 325000" value={loanAmount} setValue={setLoanAmount} />
              <div className="grid grid-cols-2 gap-4">
                <LabeledInput icon={<Percent className="h-4 w-4 opacity-70" />} label="Interest Rate" placeholder="e.g., 6.625" value={rate} setValue={setRate} />
                <LabeledInput icon={<House className="h-4 w-4 opacity-70" />} label="New Mortgage PITI" placeholder="e.g., 2384.12" value={piti} setValue={setPiti} />
              </div>
              <LabeledInput icon={<Receipt className="h-4 w-4 opacity-70" />} label="Cost" placeholder="e.g., 8750" value={cost} setValue={setCost} />

              {/* Cash-out */}
              <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/70 p-3">
                <div className="text-sm flex items-center gap-2"><Info className="h-4 w-4" /> No Cash Out</div>
                <Switch checked={noCashOut} onCheckedChange={setNoCashOut} />
              </div>
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-all ${noCashOut ? "opacity-40 pointer-events-none" : ""}`}>
                <LabeledInput icon={<DollarSign className="h-4 w-4 opacity-70" />} label="Cash-Out Amount" placeholder="e.g., 25000" value={cashOut} setValue={setCashOut} />
                <LabeledInput icon={<DollarSign className="h-4 w-4 opacity-70" />} label="Current Monthly Debt Payments" placeholder="e.g., 750" value={monthlyDebt} setValue={setMonthlyDebt} />
                <LabeledInput icon={<House className="h-4 w-4 opacity-70" />} label="Previous Mortgage PITI" placeholder="e.g., 2125.00" value={prevPiti} setValue={setPrevPiti} />
              </div>

              {/* LO / LOA */}
              <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <UserCircle2 className="h-4 w-4" /> {isLOAMode ? "Loan Officer Associate" : "Loan Officer"}
                </div>
                <LabeledInput label={`${isLOAMode ? "Associate" : "Loan Officer"} Name`} placeholder="e.g., John Doe" value={officerName} setValue={setOfficerName} />
                {!isLOAMode && (
                  <LabeledInput label="Loan Officer NMLS #" placeholder="e.g., 123456" value={officerNmls} setValue={setOfficerNmls} />
                )}
                <LabeledInput icon={<Phone className="h-4 w-4 opacity-70" />} label={`${isLOAMode ? "Associate" : "Loan Officer"} Phone`} placeholder="e.g., (313) 555-0123" value={officerPhone} setValue={setOfficerPhone} />
                <LabeledInput icon={<Mail className="h-4 w-4 opacity-70" />} label={`${isLOAMode ? "Associate" : "Loan Officer"} Email`} placeholder="e.g., jd@extremeloans.com" value={officerEmail} setValue={setOfficerEmail} />

                {isLOAMode && (
                  <div className="pt-2 border-t border-slate-700 space-y-4">
                    <div className="text-xs uppercase tracking-wide text-slate-300">Manager Contact</div>
                    <LabeledInput label="Manager Name" placeholder="e.g., Jane Smith" value={mgrName} setValue={setMgrName} />
                    <LabeledInput icon={<Phone className="h-4 w-4 opacity-70" />} label="Manager Phone" placeholder="e.g., (248) 555-0199" value={mgrPhone} setValue={setMgrPhone} />
                    <LabeledInput icon={<Mail className="h-4 w-4 opacity-70" />} label="Manager Email" placeholder="e.g., jane@extremeloans.com" value={mgrEmail} setValue={setMgrEmail} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Display */}
        <div className={`${showEdit ? "md:col-span-3" : "md:col-span-5"}`}>
          <div className="rounded-3xl border border-slate-800 overflow-hidden shadow-2xl bg-slate-900/90 print:border-0">
            <div className="relative">
              <div className="h-36 w-full bg-gradient-to-r from-indigo-700 via-indigo-400 to-white print:from-indigo-700 print:via-indigo-400 print:to-white" />
              <div className="absolute inset-0 flex items-end">
                <div className="px-8 pb-5">
                  <div className="text-xs uppercase tracking-[0.2em] opacity-90">Extreme Loans</div>
                  <h1 className="text-3xl font-extrabold drop-shadow-sm">
                    {clientName ? `${clientName}'s Price Out` : "Your Personalized Price Out"}
                  </h1>
                  <div className="text-sm opacity-95">Prepared {today}</div>
                </div>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              <ColorStat label="Loan Amount" value={currency(vals.loanAmount)} gradient="from-blue-600 to-cyan-400" icon={<DollarSign className="h-4 w-4" />} />
              <ColorStat label="Interest Rate" value={pct(vals.rate)} gradient="from-fuchsia-500 to-pink-400" icon={<Percent className="h-4 w-4" />} />
              <ColorStat label="New Mortgage PITI" value={currency(vals.piti)} gradient="from-emerald-500 to-teal-400" icon={<House className="h-4 w-4" />} textColor="text-green-400" />
              <ColorStat label="Cost (added into loan amount)" value={currency(vals.cost)} gradient="from-amber-500 to-yellow-400" icon={<Receipt className="h-4 w-4" />} />

              {!vals.noCashOut && (
                <>
                  <ColorStat label="Cash-Out Used to Pay Debt" value={currency(vals.cashOut)} gradient="from-purple-500 to-indigo-400" icon={<DollarSign className="h-4 w-4" />} />
                  <ColorStat label="Current Monthly Debt Payments" value={currency(vals.monthlyDebt)} gradient="from-rose-500 to-pink-400" icon={<DollarSign className="h-4 w-4" />} />
                  <ColorStat label="PI Increase" value={currency(piIncrease)} gradient="from-lime-500 to-green-400" icon={<House className="h-4 w-4" />} />
                  <ColorStat label="Estimated Monthly Savings" value={currency(estMonthlySavings)} gradient="from-emerald-500 to-teal-400" icon={<DollarSign className="h-4 w-4" />} textColor="text-green-400" />
                </>
              )}

              {/* LO / LOA display */}
              <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800 p-5">
                <div className="text-xs uppercase tracking-wide text-slate-300 mb-2">{isLOAMode ? "Your Loan Officer Associate" : "Your Loan Officer"}</div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <div className="text-lg font-bold">{vals.officerName || "—"}</div>
                    {!isLOAMode && (
                      <div className="text-sm text-slate-300">NMLS #{vals.officerNmls || "—"}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Phone</div>
                    <div className="text-sm font-medium">{vals.officerPhone || "—"}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-xs text-slate-400">Email</div>
                    <div className="text-sm font-medium break-all">{vals.officerEmail || "—"}</div>
                  </div>
                </div>

                {isLOAMode && (
                  <div className="mt-4 p-4 rounded-xl border border-slate-700 bg-slate-900/60">
                    <div className="text-xs uppercase tracking-wide text-slate-300 mb-2">Manager Contact</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div><div className="text-slate-400">Manager</div><div className="font-medium">{vals.mgrName || "—"}</div></div>
                      <div><div className="text-slate-400">Phone</div><div className="font-medium">{vals.mgrPhone || "—"}</div></div>
                      <div><div className="text-slate-400">Email</div><div className="font-medium break-all">{vals.mgrEmail || "—"}</div></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-2 text-xs text-slate-400">
                Rates and terms are illustrative and subject to change. Not a commitment to lend. Company NMLS: #2025962
              </div>
            </div>

            {/* Footer with centered provided white logo */}
            <div className="relative px-8 pb-16 pt-4 text-xs text-slate-500 print:pb-24">
              <div className="flex items-center justify-between">
                <span>Extreme Loans © {new Date().getFullYear()}</span>
                <span>Prepared {today}</span>
              </div>
              {/* Bottom-middle white logo (served from Next.js /public). Place the file in /public and keep this exact name or update path. */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-3 print:bottom-6">
                {/* Example path if the file is /public/Extreme-Loans-Logo-White.webp */}
                <img src="/Extreme-Loans-Logo-White.webp" alt="Extreme Loans" className="h-10 w-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 16mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

function LabeledInput({ icon, label, placeholder, value, setValue }: { icon?: React.ReactNode; label: string; placeholder: string; value: string; setValue: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs opacity-90">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
        <Input className="pl-9 bg-white text-black placeholder-slate-500" placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
    </div>
  );
}

function ColorStat({ label, value, gradient, icon, textColor }: { label: string; value: string | undefined; gradient: string; icon?: React.ReactNode; textColor?: string }) {
  return (
    <div className="rounded-2xl p-8 relative border border-slate-700 overflow-hidden min-w-0 h-full">
      <div className={`absolute inset-0 opacity-40 bg-gradient-to-br ${gradient}`} />
      <div className="relative h-full flex flex-col justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 break-words">
          {icon && <span className="text-slate-200">{icon}</span>}
          {label}
        </div>
        <div className={`mt-2 text-3xl font-extrabold break-words ${textColor || ""}`}>{value}</div>
      </div>
    </div>
  );
}
