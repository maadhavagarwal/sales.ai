"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Upload, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  FileSpreadsheet, 
  Database,
  Loader2,
  Trash2,
  Info,
  Server,
  Zap,
  Globe,
  Users
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";

export default function EnterpriseOnboarding() {
  const { setOnboardingComplete } = useStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [companyDetails, setCompanyDetails] = useState({
    name: "",
    gstin: "",
    industry: "E-Commerce",
    size: "50-200",
    hq_location: "Mumbai, India"
  });
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<any[]>([]);
  const router = useRouter();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const startAnalysis = async () => {
    if (files.length === 0) return;
    setLoading(true);
    
    try {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        
        const token = localStorage.getItem('token');
        const response = await fetch('/api/backend/workspace/universal-upload', {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.status === 'SUCCESS') {
            // Simulate neural mapping delay for premium feel
            setTimeout(() => {
                setAnalysis(data.analysis);
                setStep(3);
                setLoading(false);
            }, 2000);
        } else {
            setLoading(false);
        }
    } catch (err) {
        console.error("Upload Error:", err);
        setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
        const token = localStorage.getItem('token');
        await fetch('/api/backend/workspace/company-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(companyDetails)
        });
        setOnboardingComplete(true);
        router.push("/dashboard");
    } catch (err) {
        console.error("Save Error:", err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30 font-jakarta overflow-hidden">
      {/* Premium Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 mix-blend-overlay" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto pt-16 px-6 pb-20">
        <header className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6"
          >
            <ShieldCheck className="w-3 h-3" /> Security-First Enterprise Instance
          </motion.div>
          <h1 className="text-6xl font-black tracking-[-0.04em] leading-tight mb-4">
            Initialize <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 italic">NeuralBI</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Scale your business intelligence with zero-touch data orchestration. 
            Upload your historical ledgers and let our AI build your financial twin.
          </p>
        </header>

        {/* --- Progress Bar --- */}
        <div className="flex justify-between items-center mb-16 relative px-8">
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-800 -translate-y-1/2 -z-10" />
            {[1, 2, 3].map(i => (
                <div 
                    key={i}
                    className="flex flex-col items-center gap-3"
                >
                    <div 
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm border-2 transition-all duration-700
                            ${step >= i ? "bg-blue-600 border-blue-600 text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] rotate-0" : "bg-black border-slate-700 text-slate-500 rotate-12"}
                        `}
                    >
                        {step > i ? <CheckCircle2 className="w-6 h-6" /> : i}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${step >= i ? "text-blue-400" : "text-slate-600"}`}>
                        {i === 1 ? "Identity" : i === 2 ? "Ingestion" : "Verification"}
                    </span>
                </div>
            ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: COMPANY IDENTITY */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card variant="glass" className="bg-slate-900/30 border-white/5 p-10 backdrop-blur-2xl">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-3xl font-black flex items-center gap-3">
                    <Building2 className="w-7 h-7 text-blue-400" /> Enterprise Identity
                  </CardTitle>
                  <CardDescription className="text-slate-400">Configure your global instance parameters.</CardDescription>
                </CardHeader>
                <CardContent className="px-0 pb-0 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                           <Globe className="w-3 h-3" /> Legal Company Name
                        </label>
                        <Input 
                            placeholder="e.g. Acme Global Inc." 
                            className="bg-black/40 border-white/10 h-14 text-lg focus:border-blue-500/50 transition-all"
                            value={companyDetails.name}
                            onChange={e => setCompanyDetails({...companyDetails, name: e.target.value})}
                        />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                           <ShieldCheck className="w-3 h-3" /> GSTIN / Tax Identifier
                        </label>
                        <Input 
                            placeholder="27AAAAA0000A1Z5" 
                            className="bg-black/40 border-white/10 h-14 text-lg font-mono focus:border-blue-500/50 transition-all uppercase"
                            value={companyDetails.gstin}
                            onChange={e => setCompanyDetails({...companyDetails, gstin: e.target.value})}
                        />
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                           <Zap className="w-3 h-3" /> Industry Vertical
                        </label>
                        <select 
                            className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all appearance-none"
                            value={companyDetails.industry}
                            onChange={e => setCompanyDetails({...companyDetails, industry: e.target.value})}
                        >
                            <option>E-Commerce & Digital</option>
                            <option>SaaS / Deep Tech</option>
                            <option>Fintech / Banking</option>
                            <option>Manufacturing / OEM</option>
                            <option>Healthcare / Biotech</option>
                        </select>
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                           <Users className="w-3 h-3" /> Enterprise Size
                        </label>
                        <select 
                            className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all appearance-none"
                            value={companyDetails.size}
                            onChange={e => setCompanyDetails({...companyDetails, size: e.target.value})}
                        >
                            <option value="1-10">Startup (1-10)</option>
                            <option value="11-50">SMB (11-50)</option>
                            <option value="51-200">Scaleup (51-200)</option>
                            <option value="201-1000">Enterprise (201-1k)</option>
                            <option value="1000+">Global Corp (1k+)</option>
                        </select>
                     </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                        disabled={!companyDetails.name || !companyDetails.gstin}
                        onClick={() => setStep(2)}
                        className="w-full bg-blue-600 hover:bg-blue-500 h-14 text-lg font-black tracking-tight group shadow-[0_4px_30px_rgba(37,99,235,0.3)]"
                    >
                        Initialize Data Stream <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 2: NEURAL INGESTION */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card variant="glass" className="bg-slate-900/30 border-white/5 p-10 backdrop-blur-2xl">
                <CardHeader className="px-0 pt-0 text-center">
                  <CardTitle className="text-3xl font-black flex items-center justify-center gap-3">
                    <Database className="w-7 h-7 text-indigo-400" /> Neural Data Ingestion
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Proprietary AI will auto-segregate your ledgers, inventory catalogs, and CRM archives. 
                    <br />Supported: Tally, Zoho, Excel, CSV.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 pb-0 space-y-8">
                   <div className="border-2 border-dashed border-white/10 rounded-3xl p-16 text-center hover:border-indigo-500/50 transition-all duration-500 cursor-pointer group relative bg-white/[0.02]">
                      <input 
                        type="file" 
                        multiple 
                        className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                        onChange={handleFileUpload}
                        accept=".csv,.xlsx,.xls"
                      />
                      <div className="flex flex-col items-center gap-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
                            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-xl">
                                <Upload className="w-10 h-10 text-white" />
                            </div>
                        </div>
                        <div>
                            <p className="text-2xl font-black tracking-tight">Deploy Datasets</p>
                            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                               Batch upload multiple files. Our neural engine handles column mapping and sanitization automatically.
                            </p>
                        </div>
                        <Button variant="ghost" className="mt-2 text-indigo-400 border border-white/5 hover:bg-white/5">
                            Browse Local Archives
                        </Button>
                      </div>
                   </div>

                   {files.length > 0 && (
                     <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{files.length} Nodes Queued</p>
                            <button onClick={() => setFiles([])} className="text-[10px] font-black uppercase text-rose-500 h-6 px-2 hover:bg-rose-500/10 rounded transition-colors">Clear All</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {files.map((file, idx) => (
                                <motion.div 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={idx} 
                                    className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5 group/file"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold truncate max-w-[140px] uppercase text-slate-300">{file.name}</p>
                                            <p className="text-[8px] font-black text-slate-600 uppercase">{(file.size / 1024).toFixed(0)} KB • RAW DATA</p>
                                        </div>
                                    </div>
                                    <button onClick={() => removeFile(idx)} className="opacity-0 group-hover/file:opacity-100 transition-opacity text-slate-500 hover:text-rose-400">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                     </div>
                   )}

                   <div className="flex gap-4 pt-4">
                      <Button variant="ghost" onClick={() => setStep(1)} className="text-slate-500 hover:text-white font-bold px-8">Back</Button>
                      <Button 
                        disabled={files.length === 0 || loading}
                        onClick={startAnalysis}
                        className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 h-16 text-lg font-black tracking-tight shadow-[0_8px_30px_rgba(79,70,229,0.3)]"
                      >
                        {loading ? (
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold animate-pulse uppercase tracking-widest">Neural Mapping...</span>
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-[bounce_1s_infinite_100ms]" />
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-[bounce_1s_infinite_200ms]" />
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-[bounce_1s_infinite_300ms]" />
                                </div>
                            </div>
                        ) : (
                            <span className="flex items-center gap-2"> Execute Intelligence Ingestion <Zap className="w-5 h-5 fill-current" /></span>
                        )}
                      </Button>
                   </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 3: NEURAL VERIFICATION */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
               <Card variant="glass" className="bg-slate-900/30 border-white/5 p-10 backdrop-blur-2xl">
                <CardHeader className="px-0 pt-0 text-center">
                  <div className="relative mb-8">
                     <div className="absolute inset-0 bg-emerald-500/20 blur-3xl scale-150 animate-pulse" />
                     <div className="relative w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                     </div>
                  </div>
                  <CardTitle className="text-3xl font-black">Structure Mapping Successful</CardTitle>
                  <CardDescription className="text-slate-400">
                    The NeuralBI engine has successfully analyzed, cleaned, and categorized your enterprise data assets.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 pb-0 space-y-10">
                    <div className="grid grid-cols-1 gap-4">
                        {analysis.map((res, i) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={i} 
                                className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between group hover:bg-white/[0.05] transition-colors"
                            >
                                <div className="flex items-center gap-5">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110 ${
                                        res.category === 'INVOICE' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 
                                        res.category === 'CUSTOMER' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 
                                        res.category === 'INVENTORY' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                                        res.category === 'STAFF' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                                        res.category === 'LEDGER' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                                        res.category === 'LEADS' ? 'bg-pink-500/10 border-pink-500/20 text-pink-400' :
                                        res.category === 'PURCHASE_ORDERS' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' :
                                        res.category === 'RFM_CHURN' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                        'bg-slate-500/10 border-white/10 text-slate-400'}`}
                                    >
                                        {res.category === 'INVOICE' ? <Server className="w-6 h-6" /> : 
                                         res.category === 'CUSTOMER' ? <Users className="w-6 h-6" /> : 
                                         res.category === 'INVENTORY' ? <Database className="w-6 h-6" /> : 
                                         res.category === 'STAFF' ? <Users className="w-6 h-6" /> :
                                         res.category === 'LEDGER' ? <Database className="w-6 h-6" /> :
                                         res.category === 'LEADS' ? <FileSpreadsheet className="w-6 h-6" /> :
                                         res.category === 'PURCHASE_ORDERS' ? <FileSpreadsheet className="w-6 h-6" /> :
                                         res.category === 'RFM_CHURN' ? <Info className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black uppercase text-slate-200 tracking-tight">{res.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                                res.category === 'INVOICE' ? 'bg-blue-500/20 text-blue-300' : 
                                                res.category === 'CUSTOMER' ? 'bg-indigo-500/20 text-indigo-300' : 
                                                res.category === 'INVENTORY' ? 'bg-emerald-500/20 text-emerald-300' : 
                                                res.category === 'STAFF' ? 'bg-orange-500/20 text-orange-300' :
                                                res.category === 'LEDGER' ? 'bg-purple-500/20 text-purple-300' :
                                                res.category === 'LEADS' ? 'bg-pink-500/20 text-pink-300' :
                                                res.category === 'PURCHASE_ORDERS' ? 'bg-cyan-500/20 text-cyan-300' :
                                                res.category === 'RFM_CHURN' ? 'bg-red-500/20 text-red-300' :
                                                'bg-slate-800 text-slate-500'}`}
                                            >
                                                {res.category === 'UNSUPPORTED' ? "SYST. IGNORED" : res.category}
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">Schema Validated</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black font-mono tracking-tighter text-white">{res.records.toLocaleString()}</p>
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Records Ingested</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <ShieldCheck className="w-4 h-4 text-blue-400" />
                        </div>
                        <p className="text-xs text-blue-300/80 leading-relaxed italic">
                            These data structures have been persisted into your Global Workspace Ledger. NeuralBI will use this baseline to generate cross-sell predictions, burn-rate simulations, and statutory GSTR reports automatically.
                        </p>
                    </div>

                    <Button 
                        onClick={completeOnboarding}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 h-16 text-xl font-black tracking-tight shadow-[0_10px_40px_rgba(37,99,235,0.4)] hover:scale-[1.02] transition-transform"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Authorize & Launch Workspace"}
                    </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Footer Branding */}
      <footer className="fixed bottom-0 w-full p-8 text-center pointer-events-none opacity-40">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600">Enterprise Edition v4.0.2 • Powered by NeuralBI CORE</p>
      </footer>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
