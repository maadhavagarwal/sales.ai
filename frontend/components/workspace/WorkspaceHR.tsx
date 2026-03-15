
"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, Button, Input, Badge } from "@/components/ui"
import { getEmployees, getHRStats, addEmployee } from "@/services/api"
import { Users, UserPlus, Briefcase, DollarSign, Activity } from "lucide-react"

export default function WorkspaceHR() {
    const [employees, setEmployees] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [newEmp, setNewEmp] = useState({ name: "", role: "", dept: "", salary: 0 })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [eData, sData] = await Promise.all([getEmployees(), getHRStats()])
            setEmployees(eData)
            setStats(sData)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleAdd = async () => {
        try {
            await addEmployee(newEmp)
            setShowAdd(false)
            fetchData()
        } catch (e) {
            console.error(e)
        }
    }

    if (loading) return <div className="p-12 text-center animate-pulse">Loading Workforce Data...</div>

    return (
        <div className="space-y-8 animate-fade-in">
            {/* HR Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard icon={<Users className="w-5 h-5 text-blue-400" />} label="Total Workforce" value={stats?.total_employees || 0} />
                <StatCard icon={<Activity className="w-5 h-5 text-emerald-400" />} label="Active Status" value={stats?.active_count || 0} />
                <StatCard icon={<DollarSign className="w-5 h-5 text-amber-400" />} label="Avg. Payroll" value={`₹${(stats?.avg_salary || 0).toLocaleString()}`} />
                <StatCard icon={<Briefcase className="w-5 h-5 text-purple-400" />} label="Departments" value={Object.keys(stats?.dept_distribution || {}).length} />
            </div>

            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white tracking-tight">Active Employee Directory</h2>
                <Button variant="pro" size="sm" onClick={() => setShowAdd(true)}>
                    <UserPlus className="w-4 h-4 mr-2" /> Onboard Human Capital
                </Button>
            </div>

            <Card variant="glass" className="overflow-hidden border-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/[0.02] text-[10px] font-black uppercase tracking-[0.2em] text-white/40 border-b border-white/5">
                                <th className="px-6 py-4">Employee ID</th>
                                <th className="px-6 py-4">Full Name</th>
                                <th className="px-6 py-4">Designation</th>
                                <th className="px-6 py-4">Department</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Payroll (Mo)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {employees.map((emp) => (
                                <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4 text-xs font-bold text-white/60">{emp.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-[10px] font-black">
                                                {emp.name.split(' ').map((n: string) => n[0]).join('')}
                                            </div>
                                            <span className="text-sm font-bold text-white">{emp.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white/80">{emp.role}</td>
                                    <td className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#6366f1]">{emp.dept}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant={emp.status === 'Active' ? 'success' : 'warning'} className="text-[10px] tracking-widest">
                                            {emp.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-geist text-white">₹{emp.salary.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {showAdd && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <Card variant="bento" className="w-full max-w-md p-8 border-white/10 shadow-2xl">
                        <h3 className="text-xl font-black text-white mb-6">Onboard New Employee</h3>
                        <div className="space-y-4">
                            <Input placeholder="Full Name" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} />
                            <Input placeholder="Designation" value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value})} />
                            <Input placeholder="Department" value={newEmp.dept} onChange={e => setNewEmp({...newEmp, dept: e.target.value})} />
                            <Input placeholder="Annual CTC (₹)" type="number" value={newEmp.salary} onChange={e => setNewEmp({...newEmp, salary: Number(e.target.value)})} />
                            <div className="flex gap-4 pt-4">
                                <Button className="flex-1" variant="pro" onClick={handleAdd}>Confirm Onboarding</Button>
                                <Button className="flex-1" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}

function StatCard({ icon, label, value }: { icon: any, label: string, value: any }) {
    return (
        <Card variant="bento" className="p-6 border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    {icon}
                </div>
                <div>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{label}</p>
                    <p className="text-2xl font-black text-white tracking-tighter mt-1">{value}</p>
                </div>
            </div>
        </Card>
    )
}
