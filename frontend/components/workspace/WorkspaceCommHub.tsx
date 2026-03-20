
"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, Button, Input, Badge } from "@/components/ui"
import { 
    getMeetings, 
    createMeeting, 
    getTeamMessages, 
    sendTeamMessage, 
    sendDirectEmail,
    getOutboundEmails,
    getCommSentiment,
    summarizeMeeting
} from "@/services/api"
import { 
    Video, Mail, MessageSquare, Send, Plus, Calendar, 
    ExternalLink, Link as LinkIcon, Mic, Video as VideoIcon, 
    PhoneOff, Users, Monitor, ShieldCheck, History, FileText
} from "lucide-react"

export default function WorkspaceCommHub() {
    const [activeTab, setActiveTab] = useState<'meetings' | 'chat' | 'email'>('meetings')
    const [meetings, setMeetings] = useState<any[]>([])
    const [messages, setMessages] = useState<any[]>([])
    const [emailHistory, setEmailHistory] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [email, setEmail] = useState({ to: "", subject: "", body: "" })
    const [showCreateMeeting, setShowCreateMeeting] = useState(false)
    const [newMeet, setNewMeet] = useState({ title: "", type: "Team", start: "", duration: "30 min" })
    const [sentiment, setSentiment] = useState<{score: number, label: string, count: number} | null>(null)
    const [isSummarizing, setIsSummarizing] = useState(false)
    const [meetingSummary, setMeetingSummary] = useState<string | null>(null)
    
    // Meeting Nexus State
    const [activeMeet, setActiveMeet] = useState<any>(null)
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(false)
    
    const chatEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchCommData()
        const interval = setInterval(() => {
            if (activeTab === 'chat') fetchMessages()
        }, 5000)
        return () => clearInterval(interval)
    }, [activeTab])

    useEffect(() => {
        if (activeTab === 'email') fetchEmailHistory()
    }, [activeTab])

    const fetchCommData = async () => {
        try {
            const [meetData, sentimentData] = await Promise.all([
                getMeetings(),
                getCommSentiment()
            ])
            setMeetings(meetData)
            setSentiment(sentimentData)
            fetchMessages()
        } catch (e) { console.error(e) }
    }

    const fetchMessages = async () => {
        try {
            const msgData = await getTeamMessages()
            setMessages(msgData)
        } catch (e) { console.error(e) }
    }

    const fetchEmailHistory = async () => {
        try {
            const history = await getOutboundEmails()
            setEmailHistory(history)
        } catch (e) { console.error(e) }
    }

    const handleSendMessage = async () => {
        if (!newMessage) return
        try {
            await sendTeamMessage("You", newMessage)
            setNewMessage("")
            fetchMessages()
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
        } catch (e) { console.error(e) }
    }

    const handleSendEmail = async () => {
        if (!email.to || !email.subject) return
        try {
            await sendDirectEmail(email.to, email.subject, email.body)
            setEmail({ to: "", subject: "", body: "" })
            fetchEmailHistory()
            alert("Broadcast Communication Relay Successful")
        } catch (e) { console.error(e) }
    }

    const handleCreateMeeting = async () => {
        if (!newMeet.title) return
        try {
            await createMeeting(newMeet)
            setShowCreateMeeting(false)
            fetchCommData()
        } catch (e) { console.error(e) }
    }

    const handleSummarize = async (meet: any) => {
        try {
            setIsSummarizing(true)
            const result = await summarizeMeeting(meet.id, "Simulated meeting notes for orchestration...")
            setMeetingSummary(result.summary)
        } catch (e) {
            console.error(e)
        } finally {
            setIsSummarizing(false)
        }
    }

    const joinMeeting = (meet: any) => {
        setActiveMeet(meet)
    }

    if (activeMeet) {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="fixed inset-0 z-[200] bg-black flex flex-col"
            >
                {/* Meeting Nexus UI */}
                <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                    <img 
                        src="/meeting_nexus_background_1773582990027.png" 
                        className="absolute inset-0 w-full h-full object-cover opacity-60 blur-sm"
                        alt="Meeting Background"
                    />
                    
                    <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 gap-6 p-8 max-w-7xl w-full h-[80vh]">
                        {/* Primary Participation Node (You) */}
                        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden flex flex-col relative group">
                            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/10">
                                {isVideoOff ? (
                                    <div className="w-24 h-24 rounded-full bg-[--primary] flex items-center justify-center text-4xl font-black italic">Y</div>
                                ) : (
                                    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                                         <p className="text-white/20 text-xs font-black uppercase tracking-widest uppercase">HD NEURAL STREAM ACTIVE</p>
                                    </div>
                                )}
                            </div>
                            <div className="absolute top-4 right-4 flex gap-2">
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[9px]">LIVE</Badge>
                                <Badge className="bg-black/40 backdrop-blur-md text-white/60 border-none text-[9px] uppercase font-black">1.2ms LATENCY</Badge>
                            </div>
                            <div className="p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-center">
                                <span className="text-xs font-black text-white italic uppercase tracking-wider">You (Enterprise Lead)</span>
                                {isMuted && <Mic className="w-4 h-4 text-red-500" />}
                            </div>
                        </div>

                        {/* Remote Participation Nodes (Simulated) */}
                        {['Arjun (CFO)', 'Priya (Sales Ops)', 'AI Strategist', 'Raj (Client)'].map((name, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden flex flex-col relative">
                                <div className="flex-1 flex items-center justify-center bg-slate-800">
                                    <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl font-bold text-white/20 italic">{name[0]}</div>
                                </div>
                                <div className="p-4 bg-black/40 flex justify-between items-center">
                                    <span className="text-xs font-black text-white/60 italic uppercase tracking-wider">{name}</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Notification Overlay */}
                    <motion.div 
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="absolute right-8 top-8"
                    >
                        <Card variant="glass" className="p-4 border-white/5 w-64">
                            <h5 className="text-[10px] font-black text-white/40 uppercase mb-3 flex items-center gap-2">
                                <Users className="w-3 h-3" /> Active Roster
                            </h5>
                            <div className="space-y-2">
                                {['Arjun', 'Priya', 'Team Bot'].map(u => (
                                    <div key={u} className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-white/80">{u}</span>
                                        <div className="flex gap-2">
                                             <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                             <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                </div>

                {/* Control Panel */}
                <div className="h-24 bg-black/90 backdrop-blur-3xl border-t border-white/10 flex items-center justify-between px-12">
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black text-[--primary] uppercase tracking-[0.2em]">Neural Nexus Active</span>
                        <h4 className="text-lg font-black text-white italic uppercase">{activeMeet.title}</h4>
                     </div>

                     <div className="flex gap-6 items-center">
                        <button onClick={() => setIsMuted(!isMuted)} className={`p-4 rounded-2xl transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                            <Mic className="w-6 h-6" />
                        </button>
                        <button onClick={() => setIsVideoOff(!isVideoOff)} className={`p-4 rounded-2xl transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                            <VideoIcon className="w-6 h-6" />
                        </button>
                        <button className="p-4 rounded-2xl bg-white/5 text-white/60 hover:bg-white/10">
                            <Monitor className="w-6 h-6" />
                        </button>
                        <button onClick={() => setActiveMeet(null)} className="p-4 rounded-2xl bg-red-600 text-white hover:bg-red-700 hover:scale-105 transition-all shadow-lg shadow-red-600/20">
                            <PhoneOff className="w-6 h-6" />
                        </button>
                     </div>

                     <div className="flex items-center gap-4 text-white/40">
                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Quantum Encrypted Sync</span>
                     </div>
                </div>
            </motion.div>
        )
    }

    return (
        <div className="h-[750px] flex flex-col gap-6 animate-fade-in">
            {/* Header Tabs */}
            <div className="flex gap-2 bg-white/5 p-1 rounded-2xl w-fit border border-white/5">
                {[
                    { id: 'meetings', icon: <Video className="w-4 h-4" />, label: 'Meeting Nexus' },
                    { id: 'chat', icon: <MessageSquare className="w-4 h-4" />, label: 'Internal Relay' },
                    { id: 'email', icon: <Mail className="w-4 h-4" />, label: 'Outreach Node' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                            ${activeTab === tab.id ? 'bg-[--primary] text-white shadow-lg shadow-[--primary]/20' : 'hover:bg-white/5 text-white/40'}`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 min-h-0">
                <AnimatePresence mode="wait">
                    {activeTab === 'meetings' && (
                        <motion.div key="meetings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full flex flex-col gap-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Sync Orchestration</h3>
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1">Global enterprise virtual conferencing</p>
                                </div>
                                <Button variant="pro" size="sm" onClick={() => setShowCreateMeeting(true)}>
                                    <Plus className="w-4 h-4 mr-2" /> Orchestrate Session
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2 custom-scrollbar">
                                {meetings.length === 0 && (
                                    <div className="col-span-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                                        <Video className="w-12 h-12 mb-4" />
                                        <p className="text-xs font-black uppercase tracking-widest">No Active Sessions Found</p>
                                    </div>
                                )}
                                {meetings.map(m => (
                                    <Card key={m.id} variant="glass" className="p-6 border-white/5 group hover:border-[--primary]/30 transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <Badge className="bg-[--primary]/10 text-[--primary] border-[--primary]/20 text-[9px] font-black uppercase tracking-widest">{m.type}</Badge>
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                        </div>
                                        <h4 className="text-lg font-black text-white mb-2 line-clamp-1 italic">{m.title}</h4>
                                        <div className="space-y-3 mb-6">
                                            <p className="text-xs font-bold text-white/40 flex items-center gap-3">
                                                <Calendar className="w-3.5 h-3.5" /> {m.start} • {m.duration}
                                            </p>
                                            <div className="flex -space-x-2">
                                                {[1,2,3].map(i => (
                                                    <div key={i} className="w-6 h-6 rounded-full border border-black bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/40 uppercase tracking-tighter shadow-xl">U{i}</div>
                                                ))}
                                                <div className="w-6 h-6 rounded-full border border-black bg-[--primary]/20 flex items-center justify-center text-[8px] font-black text-[--primary] shadow-xl">+5</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => joinMeeting(m)} 
                                                className="flex-1 p-3 rounded-xl bg-[--primary] hover:bg-indigo-500 text-white shadow-lg shadow-[--primary]/20 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                            >
                                                <ExternalLink className="w-3 h-3" /> Initiate Sync
                                            </button>
                                            <button onClick={() => { navigator.clipboard.writeText(m.link); alert("Nexus Link Copied!"); }} className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all" title="Copy Link">
                                                <LinkIcon className="w-3 h-3 text-white/40" />
                                            </button>
                                            <button onClick={() => handleSummarize(m)} className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all" title="Summarize Session">
                                                <FileText className={`w-3 h-3 text-white/40 ${isSummarizing ? 'animate-spin' : ''}`} />
                                            </button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'chat' && (
                        <motion.div key="chat" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col glass-card border-white/5 bg-white/[0.01] rounded-3xl overflow-hidden p-0 shadow-2xl">
                            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[--primary] to-indigo-600 flex items-center justify-center shadow-lg shadow-[--primary]/20">
                                        <MessageSquare className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-white uppercase tracking-widest italic">Quantum Team Relay</h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-tight">Sync-Active Interface</p>
                                        </div>
                                    </div>
                                </div>
                                    <div className="flex gap-2">
                                        {sentiment && (
                                            <Badge variant="pro" className={`${sentiment.label === 'POSITIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'} border-none px-3 uppercase text-[9px] flex items-center gap-2`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${sentiment.label === 'POSITIVE' ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
                                                Team Vibe: {sentiment.label} ({Math.round(sentiment.score * 100)}%)
                                            </Badge>
                                        )}
                                        <Badge className="bg-white/5 border-white/10 text-white/40 px-3 uppercase text-[9px]">256-BIT AES</Badge>
                                    </div>
                                </div>
                            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 custom-scrollbar bg-[radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.05),transparent_50%)]">
                                {messages.length === 0 && (
                                     <div className="flex-1 flex flex-col items-center justify-center opacity-10">
                                         <MessageSquare className="w-12 h-12 mb-4" />
                                         <p className="text-xs font-black uppercase tracking-widest">Vault is empty</p>
                                     </div>
                                )}
                                {messages.map(msg => (
                                    <div key={msg.id} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[70%] p-5 rounded-3xl text-sm font-medium leading-relaxed shadow-xl
                                            ${msg.sender === 'You' 
                                                ? 'bg-gradient-to-br from-[--primary] to-indigo-700 text-white rounded-br-none shadow-[--primary]/10' 
                                                : 'bg-white/5 border border-white/10 text-white/80 rounded-bl-none'}`}>
                                            {msg.text}
                                        </div>
                                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-2 px-1 italic">
                                            {msg.sender === 'You' ? 'SECURE ORIGIN' : msg.sender} • {msg.time}
                                        </span>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                            <div className="p-6 bg-white/[0.04] backdrop-blur-xl border-t border-white/5 flex gap-4">
                                <Input 
                                    placeholder="Signal strategic insights to team..." 
                                    className="h-16 bg-white/5 border-white/10 px-8 rounded-2xl focus:border-[--primary] text-lg font-medium shadow-inner" 
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                                />
                                <Button variant="pro" className="h-16 w-16 rounded-2xl flex-shrink-0 shadow-lg shadow-[--primary]/20" onClick={handleSendMessage}>
                                    <Send className="w-6 h-6" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'email' && (
                        <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full flex gap-8">
                            {/* Compose Panel */}
                            <Card variant="bento" className="flex-[1.5] p-12 border-white/5 flex flex-col gap-8 bg-white/[0.01] overflow-y-auto custom-scrollbar">
                                <div className="max-w-2xl mx-auto w-full space-y-8">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-white/5 rounded-3xl mx-auto mb-6 flex items-center justify-center border border-white/10 rotate-3">
                                            <Mail className="w-8 h-8 text-[--primary]" />
                                        </div>
                                        <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic decoration-[--primary] underline-offset-8">Outreach Node</h3>
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mt-4 italic">Unified Professional Communication Protocol</p>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-white/40 uppercase ml-1">Recipient Identifier</label>
                                                <Input placeholder="lead@enterprise.ai" className="h-14 bg-white/5 rounded-2xl shadow-inner border-white/10" value={email.to} onChange={e => setEmail({...email, to: e.target.value})} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-white/40 uppercase ml-1">Subject Vector</label>
                                                <Input placeholder="Quarterly Value Proposition" className="h-14 bg-white/5 rounded-2xl shadow-inner border-white/10" value={email.subject} onChange={e => setEmail({...email, subject: e.target.value})} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/40 uppercase ml-1">Communication Body</label>
                                            <textarea 
                                                placeholder="Compose professional broadcast..." 
                                                className="w-full h-64 bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-base text-white focus:outline-none focus:border-[--primary] transition-all resize-none font-medium leading-relaxed custom-scrollbar shadow-inner"
                                                value={email.body}
                                                onChange={e => setEmail({...email, body: e.target.value})}
                                            />
                                        </div>
                                        <Button variant="pro" className="w-full h-18 text-lg font-black tracking-[0.3em] uppercase group" onClick={handleSendEmail}>
                                            Engage Broadcast <Send className="w-5 h-5 ml-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>

                            {/* History Rail */}
                            <Card variant="glass" className="flex-1 p-8 border-white/5 flex flex-col gap-6 bg-black/20">
                                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                                    <History className="w-4 h-4 text-white/40" />
                                    <h4 className="text-xs font-black text-white uppercase tracking-widest italic">Dispatch Vault</h4>
                                </div>
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                                    {emailHistory.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center opacity-10">
                                            <Badge className="bg-transparent border-white/10 text-white/40">Vault Closed</Badge>
                                        </div>
                                    )}
                                    {emailHistory.map(item => (
                                        <div key={item.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer group">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[10px] font-black text-[--primary] uppercase tracking-tighter truncate w-32">{item.recipient}</span>
                                                <span className="text-[9px] font-bold text-white/20">{new Date(item.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            <h5 className="text-[11px] font-bold text-white/80 line-clamp-1">{item.subject}</h5>
                                            <Badge className="mt-3 bg-emerald-500/10 text-emerald-400 border-none text-[8px] uppercase font-black">{item.status}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {showCreateMeeting && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
                    <Card variant="bento" className="w-full max-w-lg p-12 border-white/10 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[--primary]/10 blur-[60px]" />
                        <h3 className="text-3xl font-black text-white mb-2 tracking-tighter italic uppercase">Nexus Orchestration</h3>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-8">Scheduling high-fidelity participation node</p>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase ml-1">Session Title</label>
                                <Input placeholder="Internal Infrastructure Review" value={newMeet.title} onChange={e => setNewMeet({...newMeet, title: e.target.value})} className="h-14 bg-white/5 rounded-2xl border-white/10" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase ml-1">Temporal Sequence</label>
                                    <Input type="datetime-local" value={newMeet.start} onChange={e => setNewMeet({...newMeet, start: e.target.value})} className="h-14 bg-white/5 rounded-2xl border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase ml-1">Sync Duration</label>
                                    <Input placeholder="45 min" value={newMeet.duration} onChange={e => setNewMeet({...newMeet, duration: e.target.value})} className="h-14 bg-white/5 rounded-2xl border-white/10" />
                                </div>
                            </div>
                            
                            <div className="flex gap-4 pt-6">
                                <Button className="flex-1 h-16 shadow-lg shadow-[--primary]/20 font-black uppercase tracking-[0.2em] italic" variant="pro" onClick={handleCreateMeeting}>Finalize Broadcast</Button>
                                <Button className="flex-1 h-16 font-black uppercase tracking-[0.2em] text-white/40" variant="ghost" onClick={() => setShowCreateMeeting(false)}>Abort</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {meetingSummary && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
                    <Card variant="bento" className="w-full max-w-2xl p-12 border-white/10 shadow-2xl relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px]" />
                         <h3 className="text-3xl font-black text-white mb-6 tracking-tighter italic uppercase">AI Strategic Summary</h3>
                         <div className="prose prose-invert max-h-96 overflow-y-auto custom-scrollbar pr-4 text-white/80 whitespace-pre-wrap font-medium">
                             {meetingSummary}
                         </div>
                         <Button variant="pro" className="w-full mt-8 h-16 font-black uppercase" onClick={() => setMeetingSummary(null)}>Dismiss Analysis</Button>
                    </Card>
                </div>
            )}
        </div>
    )
}
