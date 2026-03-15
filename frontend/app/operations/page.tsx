"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { Card, Badge, Button, useToast, Modal, Input, Select } from "@/components/ui"
import { Users, LayoutList, Calendar as CalendarIcon, Activity, Plus, MoreHorizontal, CheckCircle2, Circle, Clock, Loader2 } from "lucide-react"

// Types
type Staff = { id: string, name: string, role: string, score: number, status: 'Active' | 'Offline' | 'On Leave', avatar: string }
type Task = { id: string, title: string, assignee: string, priority: 'High' | 'Medium' | 'Low', status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE', deadline: string }
type Shift = { id: string, name: string, date: string, hours: string, role: string }

// Mock Data
const INITIAL_STAFF: Staff[] = [
    { id: "S1", name: "Elena Rodriguez", role: "Sr. Data Engineer", score: 98, status: "Active", avatar: "ER" },
    { id: "S2", name: "James Chen", role: "Financial Controller", score: 95, status: "Active", avatar: "JC" },
    { id: "S3", name: "Sarah Miller", role: "Warehouse Lead", score: 88, status: "Offline", avatar: "SM" },
    { id: "S4", name: "David Kim", role: "AI Strategist", score: 99, status: "Active", avatar: "DK" },
    { id: "S5", name: "Maria Garcia", role: "Operations Mgr", score: 92, status: "On Leave", avatar: "MG" }
]

const INITIAL_TASKS: Task[] = [
    { id: "T1", title: "Migrate Q3 ERP Data", assignee: "Elena Rodriguez", priority: "High", status: "IN_PROGRESS", deadline: "Today" },
    { id: "T2", title: "Quarterly Statutory Audit", assignee: "James Chen", priority: "High", status: "TODO", deadline: "Tomorrow" },
    { id: "T3", title: "Optimize Inventory Network", assignee: "David Kim", priority: "Medium", status: "REVIEW", deadline: "In 2 days" },
    { id: "T4", title: "Update Fulfillment Logic", assignee: "Sarah Miller", priority: "Low", status: "DONE", deadline: "Last week" },
    { id: "T5", title: "Configure New Webhooks", assignee: "Elena Rodriguez", priority: "Medium", status: "TODO", deadline: "Next Week" }
]

const INITIAL_SHIFTS: Shift[] = [
    { id: "SH1", name: "Morning Ops Sync", date: "Today", hours: "09:00 - 10:00", role: "All Leads" },
    { id: "SH2", name: "Data Pipeline Maintenance", date: "Today", hours: "13:00 - 17:00", role: "Engineering" },
    { id: "SH3", name: "Audit Review", date: "Tomorrow", hours: "10:00 - 12:00", role: "Finance" },
    { id: "SH4", name: "Strategic Planning", date: "Tomorrow", hours: "15:00 - 16:30", role: "Management" }
]

export default function OperationsHub() {
    const { showToast } = useToast()
    const [activeTab, setActiveTab] = useState<'roster' | 'tasks' | 'schedule'>('roster')
    const [loading, setLoading] = useState(true)
    const [personnel, setPersonnel] = useState<Staff[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [schedules, setSchedules] = useState<Shift[]>([])
    const [activeModal, setActiveModal] = useState<null | 'roster' | 'tasks' | 'schedule'>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form States
    const [formData, setFormData] = useState<any>({})

    const fetchOpsData = async () => {
        try {
            const res = await fetch("/api/backend/operations")
            const data = await res.json()
            
            if (data.error) throw new Error(data.error)

            // Map backend names to frontend naming conventions
            setPersonnel((data.personnel || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                role: p.role,
                score: p.efficiency_score,
                status: p.status,
                avatar: p.avatar || p.name.split(' ').map((n: string) => n[0]).join('')
            })))

            setTasks((data.tasks || []).map((t: any) => ({
                id: t.id,
                title: t.title,
                assignee: t.assignee_id || "Unassigned",
                priority: t.priority,
                status: t.status,
                deadline: t.deadline
            })))

            setSchedules((data.schedules || []).map((s: any) => ({
                id: s.id,
                name: s.title,
                date: s.date,
                hours: s.hours,
                role: s.role_requirement
            })))
        } catch (error: any) {
            console.error("Fetch error:", error)
            showToast("error", "Sync Error", "Failed to connect to Operational Data Engine")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchOpsData()
    }, [])

    // Handlers
    const moveTask = async (taskId: string, newStatus: Task['status']) => {
        try {
            const res = await fetch("/api/backend/operations/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    op: "UPDATE_STATUS",
                    data: { id: taskId, status: newStatus }
                })
            })
            if (res.ok) {
                setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
                showToast("success", "Protocol Updated", `Task ${taskId} shifted to ${newStatus}`)
            }
        } catch (error) {
            showToast("error", "Command Failed", "System synchronization error")
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            const endpoint = activeModal === 'roster' ? 'personnel' : activeModal === 'tasks' ? 'tasks' : 'schedules'
            const res = await fetch(`/api/backend/operations/${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    op: "CREATE",
                    data: formData
                })
            })
            
            if (res.ok) {
                showToast("success", "Deployment Initialized", `Target ${endpoint} has been integrated into the cluster.`)
                setActiveModal(null)
                setFormData({})
                fetchOpsData()
            } else {
                throw new Error("API rejection")
            }
        } catch (error) {
            showToast("error", "Deployment Failure", "Neural link rejected the initialization request.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const priorityColors = {
        High: "text-rose-400 bg-rose-400/10 border-rose-400/20",
        Medium: "text-amber-400 bg-amber-400/10 border-amber-400/20",
        Low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
    }

    return (
        <DashboardLayout
            title="Operations Hub"
            subtitle="Autonomous Staff & Task Management Protocol"
        >
            <div className="space-y-8 max-w-[1600px] mx-auto">
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card variant="glass" padding="md" className="border-white/5">
                        <div className="flex items-center gap-3 mb-2 text-[--text-muted]">
                            <Users className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Active Personnel</span>
                        </div>
                        <div className="text-3xl font-black text-white">42<span className="text-sm font-medium text-[--text-muted] ml-2">/ 45</span></div>
                    </Card>
                    <Card variant="glass" padding="md" className="border-white/5">
                        <div className="flex items-center gap-3 mb-2 text-[--text-muted]">
                            <Activity className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Sprint Velocity</span>
                        </div>
                        <div className="text-3xl font-black text-[--accent-emerald]">94%</div>
                    </Card>
                    <Card variant="glass" padding="md" className="border-white/5">
                        <div className="flex items-center gap-3 mb-2 text-[--text-muted]">
                            <LayoutList className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Pending Tasks</span>
                        </div>
                        <div className="text-3xl font-black text-[--accent-amber]">{tasks.filter(t => t.status !== 'DONE').length}</div>
                    </Card>
                    <Card variant="glass" padding="md" className="border-white/5">
                        <div className="flex items-center gap-3 mb-2 text-[--text-muted]">
                            <CalendarIcon className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Next Milestone</span>
                        </div>
                        <div className="text-xl font-black text-white mt-2">Q3 Compliance Review</div>
                    </Card>
                </div>

                {/* Tabs */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-2 border-b border-white/5">
                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 shadow-inner overflow-hidden">
                        {[
                            { id: 'roster', label: 'Roster', icon: Users },
                            { id: 'tasks', label: 'Tasks & Sprints', icon: LayoutList },
                            { id: 'schedule', label: 'Schedule', icon: CalendarIcon }
                        ].map((tab) => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`
                                        relative flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300
                                        ${activeTab === tab.id ? "text-white" : "text-[--text-muted] hover:text-white"}
                                    `}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <motion.div
                                            layoutId="opTab"
                                            className="absolute inset-0 bg-white/10 shadow-[--shadow-glow] z-[-1] rounded-xl border border-white/10"
                                        />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                    <Button 
                        variant="pro" 
                        size="sm" 
                        icon={<Plus className="w-4 h-4" />}
                        onClick={() => {
                            setFormData(
                                activeTab === 'roster' ? { status: 'Active', role: 'Operator' } :
                                activeTab === 'tasks' ? { priority: 'Medium', status: 'TODO' } :
                                { type: 'SHIFT' }
                            )
                            setActiveModal(activeTab)
                        }}
                    >
                        Deploy New {activeTab === 'roster' ? 'Agent' : activeTab === 'tasks' ? 'Protocol' : 'Event'}
                    </Button>
                </div>

                {/* Content Area */}
                <AnimatePresence mode="wait">
                    {/* STAFF ROSTER */}
                    {activeTab === 'roster' && (
                        <motion.div
                            key="roster"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-black/20 border border-white/5 rounded-[2rem] overflow-hidden"
                        >
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-[--text-muted]">Personnel</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-[--text-muted]">Directive/Role</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-[--text-muted]">Efficiency Score</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-[--text-muted]">System Status</th>
                                        <th className="p-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-[--text-muted]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center">
                                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-[--primary] mb-4" />
                                                <div className="text-xs font-black uppercase tracking-[0.3em] text-[--text-muted]">Synchronizing Roster...</div>
                                            </td>
                                        </tr>
                                    ) : personnel.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center text-[--text-muted] text-xs font-bold uppercase tracking-widest">
                                                No enterprise personnel found.
                                            </td>
                                        </tr>
                                    ) : personnel.map((staff, idx) => (
                                        <motion.tr 
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            key={staff.id} 
                                            className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                                        >
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[--primary]/20 to-[--accent-violet]/20 border border-white/10 flex items-center justify-center font-black text-xs text-white">
                                                        {staff.avatar}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm text-white">{staff.name}</div>
                                                        <div className="text-[10px] text-[--text-muted] font-mono mt-0.5">ID: {staff.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-sm text-[--text-secondary] font-medium">{staff.role}</td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-full max-w-[100px] h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full ${staff.score > 90 ? 'bg-[--accent-emerald]' : 'bg-[--accent-amber]'}`} 
                                                            style={{ width: `${staff.score}%` }} 
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold font-mono">{staff.score}</span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <Badge 
                                                    variant={staff.status === 'Active' ? 'success' : staff.status === 'Offline' ? 'outline' : 'warning'} 
                                                    size="xs"
                                                >
                                                    {staff.status}
                                                </Badge>
                                            </td>
                                            <td className="p-6 text-right">
                                                <button className="p-2 rounded-lg hover:bg-white/5 text-[--text-muted] hover:text-white transition-colors">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </motion.div>
                    )}

                    {/* TASKS KANBAN */}
                    {activeTab === 'tasks' && (
                        <motion.div
                            key="tasks"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-1 md:grid-cols-4 gap-6"
                        >
                            {[
                                { status: 'TODO', title: 'Backlog', icon: Circle, color: 'text-slate-400' },
                                { status: 'IN_PROGRESS', title: 'In Execution', icon: Clock, color: 'text-blue-400' },
                                { status: 'REVIEW', title: 'Verification', icon: Activity, color: 'text-amber-400' },
                                { status: 'DONE', title: 'Completed', icon: CheckCircle2, color: 'text-emerald-400' }
                            ].map(col => (
                                <div key={col.status} className="bg-black/20 border border-white/5 rounded-3xl p-5 flex flex-col h-[600px]">
                                    <div className="flex items-center justify-between mb-6 px-1">
                                        <div className="flex items-center gap-2">
                                            <col.icon className={`w-4 h-4 ${col.color}`} />
                                            <h3 className="text-xs font-black uppercase tracking-widest text-white">{col.title}</h3>
                                        </div>
                                        <span className="text-xs font-black bg-white/5 px-2 py-0.5 rounded-lg text-[--text-muted]">
                                            {tasks.filter(t => t.status === col.status).length}
                                        </span>
                                    </div>
                                    
                                    <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide pr-1">
                                        {tasks.filter(t => t.status === col.status).map(task => (
                                            <Card key={task.id} variant="glass" padding="md" className="border-white/10 hover:border-white/20 transition-all cursor-grab active:cursor-grabbing group">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${priorityColors[task.priority]}`}>
                                                        {task.priority}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-bold text-white mb-2 leading-tight">{task.title}</h4>
                                                
                                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2 text-[--text-secondary] font-medium">
                                                        <div className="w-5 h-5 rounded-md bg-[--primary]/20 text-[--primary] flex items-center justify-center font-black text-[9px]">
                                                            {task.assignee.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                        <span className="truncate max-w-[100px]">{task.assignee}</span>
                                                    </div>
                                                </div>

                                                {/* Mini Quick Actions directly on the card to simulate moves easily */}
                                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                                                    {col.status !== 'TODO' && <button onClick={() => moveTask(task.id, 'TODO')} className="p-1 hover:bg-white/10 rounded" title="Move to TODO">👈</button>}
                                                    {col.status !== 'DONE' && <button onClick={() => moveTask(task.id, 'DONE')} className="p-1 hover:bg-white/10 rounded" title="Move to DONE">👉</button>}
                                                </div>
                                            </Card>
                                        ))}
                                        {tasks.filter(t => t.status === col.status).length === 0 && (
                                            <div className="h-full flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-[--text-muted]/30 border-2 border-dashed border-white/5 rounded-2xl">
                                                Empty Queue
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* SCHEDULE */}
                    {activeTab === 'schedule' && (
                        <motion.div
                            key="schedule"
                            initial={{ opacity: 0, scale: 0.99 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.99 }}
                            className="bg-black/20 border border-white/5 rounded-[2rem] p-8"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2">
                                    <h3 className="text-lg font-black text-white mb-6">Upcoming Milestones & Shifts</h3>
                                    <div className="space-y-4">
                                        {loading ? (
                                            <div className="p-10 text-center animate-pulse">Loading operations...</div>
                                        ) : schedules.length === 0 ? (
                                            <div className="p-10 border border-white/5 border-dashed rounded-2xl text-center text-[--text-muted] text-[10px] font-black uppercase tracking-widest">
                                                Zero events scheduled
                                            </div>
                                        ) : schedules.map((shift, i) => (
                                            <div key={shift.id} className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/[0.07] transition-colors group">
                                                <div className="flex items-center gap-3 w-1/4">
                                                    <div className="w-10 h-10 rounded-xl bg-[--primary]/10 border border-[--primary]/20 flex flex-col items-center justify-center">
                                                        <span className="text-[10px] font-black text-[--primary] uppercase">{shift.date === 'Today' ? 'TDY' : 'TMR'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-white group-hover:text-[--primary] transition-colors">{shift.name}</h4>
                                                    <div className="text-xs text-[--text-secondary] mt-1 flex items-center gap-2">
                                                        <Clock className="w-3 h-3" /> {shift.hours}
                                                    </div>
                                                </div>
                                                <div className="w-1/4 flex items-center justify-end">
                                                    <Badge variant="outline" size="sm">{shift.role}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <Card variant="bento" padding="lg" className="h-full border-[--primary]/20 bg-[--primary]/5">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-[--primary] mb-4">Strategic Timeline</h3>
                                        <div className="relative pl-4 border-l-2 border-white/10 space-y-8 mt-8">
                                            <div className="relative">
                                                <div className="absolute -left-[21px] top-1 w-3 h-3 bg-[--accent-emerald] rounded-full ring-4 ring-black" />
                                                <div className="text-xs font-bold text-white">Q1 Tax Filing</div>
                                                <div className="text-[10px] text-[--text-muted] mt-1">Completed successfully</div>
                                            </div>
                                            <div className="relative">
                                                <div className="absolute -left-[21px] top-1 w-3 h-3 bg-[--primary] rounded-full ring-4 ring-black animate-pulse" />
                                                <div className="text-xs font-bold text-white">System Migration</div>
                                                <div className="text-[10px] text-[--text-muted] mt-1">In progress (85%)</div>
                                            </div>
                                            <div className="relative">
                                                <div className="absolute -left-[21px] top-1 w-3 h-3 bg-white/20 rounded-full ring-4 ring-black" />
                                                <div className="text-xs font-bold text-[--text-muted]">Q2 Vendor Payouts</div>
                                                <div className="text-[10px] text-[--text-muted] mt-1">Scheduled next week</div>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* CREATION MODALS */}
                <Modal 
                    isOpen={!!activeModal} 
                    onClose={() => setActiveModal(null)}
                    title={`Deploy New ${activeModal === 'roster' ? 'Personnel' : activeModal === 'tasks' ? 'Operational Task' : 'Schedule Event'}`}
                    size="md"
                >
                    <form onSubmit={handleCreate} className="space-y-6">
                        {activeModal === 'roster' && (
                            <>
                                <Input 
                                    label="Agent Name" 
                                    placeholder="Enter full identity..." 
                                    required 
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                                <Input 
                                    label="Neural ID / Email" 
                                    type="email" 
                                    placeholder="agent@neural.network" 
                                    required 
                                    value={formData.email || ''}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                />
                                <Select 
                                    label="Directive / Role"
                                    options={[
                                        { value: 'Sr. Data Engineer', label: 'Sr. Data Engineer' },
                                        { value: 'Financial Controller', label: 'Financial Controller' },
                                        { value: 'AI Strategist', label: 'AI Strategist' },
                                        { value: 'Operations Mgr', label: 'Operations Mgr' },
                                        { value: 'Operator', label: 'Operator' }
                                    ]}
                                    value={formData.role}
                                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                                />
                            </>
                        )}

                        {activeModal === 'tasks' && (
                            <>
                                <Input 
                                    label="Protocol Title" 
                                    placeholder="Task objective..." 
                                    required 
                                    value={formData.title || ''}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                />
                                <Input 
                                    label="Description" 
                                    placeholder="Detailed parameters..." 
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Select 
                                        label="Priority"
                                        options={[
                                            { value: 'High', label: 'High' },
                                            { value: 'Medium', label: 'Medium' },
                                            { value: 'Low', label: 'Low' }
                                        ]}
                                        value={formData.priority}
                                        onChange={(e) => setFormData({...formData, priority: e.target.value})}
                                    />
                                    <Select 
                                        label="Assignee"
                                        options={[
                                            { value: 'Unassigned', label: 'Unassigned' },
                                            ...personnel.map(p => ({ value: p.id, label: p.name }))
                                        ]}
                                        value={formData.assignee_id}
                                        onChange={(e) => setFormData({...formData, assignee_id: e.target.value})}
                                    />
                                </div>
                                <Input 
                                    label="Deadline" 
                                    type="date" 
                                    required 
                                    value={formData.deadline || ''}
                                    onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                                />
                            </>
                        )}

                        {activeModal === 'schedule' && (
                            <>
                                <Input 
                                    label="Event Title" 
                                    placeholder="Sync or Milestone name..." 
                                    required 
                                    value={formData.title || ''}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input 
                                        label="Date" 
                                        type="date" 
                                        required 
                                        value={formData.date || ''}
                                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                                    />
                                    <Input 
                                        label="Time/Hours" 
                                        placeholder="09:00 - 10:00" 
                                        required 
                                        value={formData.hours || ''}
                                        onChange={(e) => setFormData({...formData, hours: e.target.value})}
                                    />
                                </div>
                                <Input 
                                    label="Role Requirement" 
                                    placeholder="Managers, All Leads, etc." 
                                    value={formData.role_requirement || ''}
                                    onChange={(e) => setFormData({...formData, role_requirement: e.target.value})}
                                />
                            </>
                        )}

                        <div className="flex gap-3 justify-end mt-8">
                            <Button variant="outline" type="button" onClick={() => setActiveModal(null)}>Cancel</Button>
                            <Button variant="pro" type="submit" loading={isSubmitting}>Synchronize Deployment</Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </DashboardLayout>
    )
}
