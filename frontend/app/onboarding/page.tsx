"use client";

import React, { useState } from "react";
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
  Zap,
  Globe,
  Users
} from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { getOnboardingLaunchGates, getOnboardingTemplates, postOrganizationInitialize, uploadUniversalFile } from "@/services/api";

export default function EnterpriseOnboarding() {
  const { setOnboardingComplete } = useStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [companyDetails, setCompanyDetails] = useState({
    name: "",
    gstin: "",
    industry: "E-Commerce & Digital",
    size: "51-200"
  });
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("general");
  const [launchGates, setLaunchGates] = useState<{ score: number; blockers: string[] } | null>(null);
  const router = useRouter();
  const { showToast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
      showToast("info", "Node Queued", `${e.target.files.length} dataset(s) staged.`);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  React.useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await getOnboardingTemplates();
        setTemplates(res.items || []);
      } catch {
        setTemplates([]);
      }
    };
    loadTemplates();
  }, []);

  const initializeEnterprise = async () => {
    if (!companyDetails.name) return;
    setLoading(true);
    try {
      await postOrganizationInitialize({ ...companyDetails, workspace_template: selectedTemplate });
      showToast("success", "Identity Established", "Enterprise ID and Master Workspace generated.");
      setStep(2);
    } catch (err: any) {
      showToast("error", "Initialization Failed", err.message || "Neural link error.");
    } finally {
      setLoading(false);
    }
  };

  const startAnalysis = async () => {
    if (files.length === 0) return;
    setLoading(true);
    try {
      // Direct high-speed upload
      const res = await uploadUniversalFile(files);
      if (res.status === 'SUCCESS') {
        try {
          const gates = await getOnboardingLaunchGates();
          setLaunchGates({ score: gates.score, blockers: gates.blockers || [] });
        } catch {
          setLaunchGates(null);
        }
        setTimeout(() => {
          setAnalysis(res.analysis || []);
          setStep(3);
          setLoading(false);
          showToast("success", "Ingestion Complete", "Datasets mapped to autonomous ledger.");
        }, 1500);
      }
    } catch (err: any) {
      showToast("error", "Mapping Interrupted", err.message || "Buffer overflow.");
      setLoading(false);
    }
  };

  const completeOnboarding = () => {
    setOnboardingComplete(true);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[--background] text-[--text-primary] selection:bg-[--primary]/30 font-jakarta overflow-hidden relative">
      {/* Premium Neural Ambience */}
      <div className="absolute inset-0 neural-grid">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(59,130,246,0.1),transparent_50%),radial-gradient(circle_at_100%_100%,rgba(99,102,241,0.08),transparent_50%)]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto pt-20 px-6 pb-20">
        <header className="text-center mb-16">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-[0.4em] mb-8">
            <ShieldCheck className="w-4 h-4" /> Autonomous Enterprise Protocol active
          </motion.div>
          <h1 className="text-5xl font-black tracking-[-0.05em] leading-[0.9] mb-4 uppercase">
            Initialize <span className="text-indigo-500 italic">Neural</span> Presence
          </h1>
          <p className="text-[--text-muted] text-sm max-w-lg mx-auto leading-relaxed font-bold uppercase tracking-widest opacity-60">
            Scale your business intelligence with zero-touch data orchestration.
          </p>
        </header>

        {/* --- Progress Ribbon --- */}
        <div className="flex justify-between items-center mb-24 relative px-12">
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/5 -translate-y-1/2 -z-10" />
            {[1, 2, 3].map(i => (
                <div key={i} className="flex flex-col items-center gap-5">
                    <div className={`w-14 h-14 rounded-3xl flex items-center justify-center font-black text-lg transition-all duration-1000 border ${step >= i ? "bg-indigo-500 border-indigo-500 shadow-indigo-500/30 rotate-0" : "bg-black/40 border-white/5 text-white/20 rotate-12"}`}>
                        {step > i ? <CheckCircle2 className="w-8 h-8" /> : i}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-[0.4em] ${step >= i ? "text-indigo-400" : "text-white/10"}`}>
                        {i === 1 ? "Identity" : i === 2 ? "Nexus" : "Launch"}
                    </span>
                </div>
            ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-10">
              <Card variant="glass" className="bg-black/40 border-white/5 p-12 backdrop-blur-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-center gap-5 mb-12">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400"><Building2 className="w-8 h-8" /></div>
                  <div>
                    <h3 className="text-2xl font-black text-[--text-primary] tracking-tight uppercase">Corporate Identity</h3>
                    <p className="text-xs font-bold text-[--text-muted] uppercase tracking-widest mt-1">Configure global instance parameters.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-indigo-400/80 tracking-[0.3em] flex items-center gap-2"><Globe className="w-3 h-3" /> Legal Entity</label>
                      <input placeholder="e.g. Acme Matrix Ltd." className="w-full bg-white/5 border border-white/10 rounded-2xl h-16 px-6 text-lg font-bold focus:border-indigo-500/50 outline-none transition-all placeholder:opacity-20 uppercase" value={companyDetails.name} onChange={e => setCompanyDetails({...companyDetails, name: e.target.value})} />
                   </div>
                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-indigo-400/80 tracking-[0.3em] flex items-center gap-2"><ShieldCheck className="w-3 h-3" /> Statutory ID (GSTIN)</label>
                      <input placeholder="27AAAAA0000A1Z5" className="w-full bg-white/5 border border-white/10 rounded-2xl h-16 px-6 text-lg font-geist focus:border-indigo-500/50 outline-none transition-all uppercase" value={companyDetails.gstin} onChange={e => setCompanyDetails({...companyDetails, gstin: e.target.value})} />
                   </div>
                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-indigo-400/80 tracking-[0.3em] flex items-center gap-2"><Zap className="w-3 h-3" /> Cluster Sector</label>
                      <select className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-xs font-black uppercase tracking-widest outline-none focus:border-indigo-500/50" value={companyDetails.industry} onChange={e => setCompanyDetails({...companyDetails, industry: e.target.value})}>
                          <option className="bg-slate-900">E-Commerce & Digital</option>
                          <option className="bg-slate-900">Manufacturing / Industry 4.0</option>
                          <option className="bg-slate-900">SaaS / Deep Tech Hub</option>
                      </select>
                   </div>
                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-indigo-400/80 tracking-[0.3em] flex items-center gap-2"><Users className="w-3 h-3" /> Workforce Scale</label>
                      <select className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-xs font-black uppercase tracking-widest outline-none focus:border-indigo-500/5" value={companyDetails.size} onChange={e => setCompanyDetails({...companyDetails, size: e.target.value})}>
                          <option className="bg-slate-900" value="1-50">Emerging Core (1-50)</option>
                          <option className="bg-slate-900" value="51-200">Growth Aggregator (51-200)</option>
                          <option className="bg-slate-900" value="200+">Global Enterprise (200+)</option>
                      </select>
                   </div>
                   <div className="space-y-4 md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-indigo-400/80 tracking-[0.3em]">Workspace Template</label>
                      <select
                        className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-xs font-black uppercase tracking-widest outline-none focus:border-indigo-500/50"
                        value={selectedTemplate}
                        onChange={e => setSelectedTemplate(e.target.value)}
                      >
                        {(templates.length ? templates : [{ id: "general", name: "General Business" }]).map((tpl: any) => (
                          <option key={tpl.id} value={tpl.id} className="bg-slate-900">{tpl.name}</option>
                        ))}
                      </select>
                   </div>
                </div>

                <Button disabled={!companyDetails.name || loading} onClick={initializeEnterprise} className="w-full h-20 text-xl font-black tracking-tight group shadow-indigo-500/20">
                    {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <span className="flex items-center gap-4"> GENERATE ENTERPRISE ASSET <ArrowRight className="group-hover:translate-x-2 transition-transform" /></span>}
                </Button>
              </Card>
            </motion.div>
          )}

          {/* STEP 2: NEXUS INGESTION */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-10">
              <Card variant="glass" className="bg-black/40 border-white/5 p-12 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2" />
                <div className="text-center mb-16 relative z-10">
                  <Badge variant="pro" pulse className="mb-6 tracking-widest">INGESTION STREAM READY</Badge>
                  <h2 className="text-4xl font-black text-[--text-primary] tracking-tighter uppercase leading-none">Dataset Ingestion Nexus</h2>
                  <p className="text-xs font-black text-[--text-muted] uppercase tracking-widest mt-4 opacity-70 italic max-w-sm mx-auto leading-relaxed">Let our neural engine auto-segregate your ledgers, inventory catalogs, and CRM archives.</p>
                </div>

                <div className="border-2 border-dashed border-white/5 rounded-3xl p-24 text-center hover:border-indigo-500/30 transition-all cursor-pointer group relative bg-white/2">
                    <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer z-20" onChange={handleFileUpload} accept=".csv,.xlsx,.xls" />
                    <div className="flex flex-col items-center gap-8">
                      <div className="w-24 h-24 rounded-[40px] bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform neural-pulse-glow"><Upload className="w-10 h-10 text-indigo-400" /></div>
                      <div>
                          <p className="text-3xl font-black tracking-tighter uppercase">Drop Corporate Nodes</p>
                          <p className="text-[10px] font-black text-indigo-400 mt-2 uppercase tracking-[0.3em]">Support: Excel, CSV, Tally XML</p>
                      </div>
                    </div>
                </div>

                {files.length > 0 && (
                  <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                     {files.map((f, i) => (
                       <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={i} className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><FileSpreadsheet className="w-5 h-5 text-emerald-400" /></div>
                             <div className="truncate w-32"><p className="text-xs font-black uppercase text-emerald-400/70 truncate">{f.name}</p><p className="text-[8px] font-black tracking-widest text-white/20 mt-1 uppercase">NODE DETECTED</p></div>
                          </div>
                          <button onClick={() => removeFile(i)} className="p-2 opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-all"><Trash2 className="w-4 h-4" /></button>
                       </motion.div>
                     ))}
                  </div>
                )}

                <div className="flex gap-4 mt-20">
                   <Button variant="outline" onClick={() => setStep(1)} className="text-[10px] tracking-widest font-black uppercase border-white/5 px-10">TERMINATE</Button>
                   <Button disabled={files.length === 0 || loading} onClick={startAnalysis} className="flex-1 h-20 text-xl font-black tracking-tight shadow-indigo-500/20">
                      {loading ? <span className="flex items-center gap-4 animate-pulse">NEURAL MAPPING IN PROGRESS <Loader2 className="w-6 h-6 animate-spin" /></span> : <span className="flex items-center gap-4 uppercase font-black">START COGNITIVE INGESTION <Zap className="w-6 h-6 fill-current" /></span>}
                   </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* STEP 3: LAUNCH */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10">
               <Card variant="glass" className="bg-black/40 border-white/5 p-12 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
                  <div className="relative mb-12">
                     <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center mx-auto neural-pulse-glow"><CheckCircle2 className="w-12 h-12 text-emerald-400" /></div>
                  </div>
                  <h2 className="text-4xl font-black text-[--text-primary] tracking-tighter uppercase leading-none">Workspace Synchronized</h2>
                  <p className="text-xs font-black text-[--text-muted] uppercase tracking-[0.3em] mt-6 opacity-60">Neural mapping successful. All nodes are encrypted and active.</p>
                  {launchGates && (
                    <div className="mt-8 text-xs text-[--text-secondary]">
                      Launch Gate Score: <span className="font-black text-[--text-primary]">{launchGates.score}%</span>
                      {launchGates.blockers.length > 0 && (
                        <div className="mt-2">Pending gates: {launchGates.blockers.join(", ")}</div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 mt-20 text-left">
                      {analysis.map((res, i) => (
                        <Card key={i} variant="glass" className="p-5 border-white/5 bg-white/2 flex items-center justify-between group hover:bg-white/5 transition-all">
                           <div className="flex items-center gap-6">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform"><Database className="w-6 h-6" /></div>
                              <div>
                                <p className="text-sm font-black text-[--text-primary] uppercase tracking-tight">{res.name}</p>
                                <div className="flex items-center gap-3 mt-1 opacity-60"><Badge variant="pro" size="xs">{res.category}</Badge><span className="text-[9px] font-black uppercase tracking-widest">SCHEMA VERIFIED</span></div>
                              </div>
                           </div>
                           <div className="text-right"><p className="text-3xl font-black font-geist tracking-tighter text-indigo-400">{res.records?.toLocaleString()}</p><p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">RECORDS</p></div>
                        </Card>
                      ))}
                  </div>

                  <Button onClick={completeOnboarding} className="w-full h-24 text-2xl font-black tracking-tight shadow-emerald-500/20 mt-20 hover:scale-[1.02] transition-transform">
                     LAUNCH MASTER CONTROL
                  </Button>
               </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-24 text-center opacity-30">
          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-[--text-muted]">NeuralBI Enterprise Protocol v4.0.1 • Authorized Access Only</p>
        </footer>
      </div>
    </div>
  );
}
