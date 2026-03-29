/**
 * HR PAGE - REFACTORED WITH SYNCHRONIZED DATA
 * Now all changes are automatically reflected across system pages
 * 
 * Usage:
 * - Create employee → Updates sync store → All pages using employees get updated
 * - Delete employee → Sync store reflects change → HR, Portal, Expense pages all update
 * - Update employee → Immediate sync across all pages
 */

"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    AlertCircle,
    CheckCircle,
    Mail,
    Plus,
    Trash2,
    User,
    Users,
    Edit,
    Send,
    Loader,
    Copy,
    Eye,
    EyeOff,
} from "lucide-react"
import { useRoleAccess } from "@/hooks/useRoleAccess"
import { useSynchronizedData, useSyncListener } from "@/hooks/useSynchronizedData"

interface AlertMessage {
    type: "success" | "error" | "info"
    message: string
}

export default function HRPageSync() {
    const { isAuthorized, isLoading } = useRoleAccess(["ADMIN", "HR"])

    // Use synchronized data hook - automatically syncs across all pages
    const {
        data: employees,
        loading,
        error,
        refresh,
        create,
        update,
        delete: deleteEmployee,
    } = useSynchronizedData("employees", {
        autoRefresh: true,
        refreshInterval: 30000, // Refresh every 30 seconds
    })

    // Listen for updates on employees from other pages
    useSyncListener("employees", () => {
        console.log("✅ Employees updated from another page - auto-synced!")
        // If you need to do something special on sync
    })

    const [tab, setTab] = useState<"employees" | "create" | "email">("employees")
    const [loadingLocal, setLoadingLocal] = useState(false)
    const [alert, setAlert] = useState<AlertMessage | null>(null)
    const [generatedPassword, setGeneratedPassword] = useState<string>("")

    // Form states
    const [createForm, setCreateForm] = useState({
        email: "",
        name: "",
        role: "SALES",
        department: "Sales",
        message: "",
        send_email: true,
    })

    const [emailForm, setEmailForm] = useState({
        recipient_email: "",
        subject: "",
        message: "",
        action_type: "notification",
    })

    // Create employee
    const handleCreateEmployee = async () => {
        if (!createForm.email || !createForm.name) {
            setAlert({
                type: "error",
                message: "Please fill in email and name",
            })
            return
        }

        setLoadingLocal(true)
        try {
            // Create via synchronized data hook
            const newEmployee = await create({
                email: createForm.email,
                name: createForm.name,
                role: createForm.role,
                department: createForm.department,
                message: createForm.message,
                send_email: createForm.send_email,
            })

            setGeneratedPassword(newEmployee?.temp_password || "")
            setAlert({
                type: "success",
                message: "Employee created successfully",
            })

            // Reset form
            setCreateForm({
                email: "",
                name: "",
                role: "SALES",
                department: "Sales",
                message: "",
                send_email: true,
            })

            // No need to manually refresh - sync hook handles it!
            // All other pages using employees will auto-update
        } catch (error) {
            console.error("Error creating employee:", error)
            setAlert({
                type: "error",
                message: "Failed to create employee. Check network.",
            })
        } finally {
            setLoadingLocal(false)
        }
    }

    // Delete employee
    const handleDeleteEmployee = async (employeeId: string | number) => {
        if (!confirm("Remove this employee?")) return

        try {
            await deleteEmployee(employeeId)
            setAlert({
                type: "success",
                message: "Employee removed",
            })
            // Auto-synced to all pages!
        } catch (error) {
            setAlert({
                type: "error",
                message: "Failed to delete employee",
            })
        }
    }

    // Update employee role
    const handleUpdateRole = async (employeeId: string | number) => {
        try {
            await update(employeeId, { role: "MANAGER" })
            setAlert({
                type: "success",
                message: "Employee role updated",
            })
            // Auto-synced to all pages!
        } catch (error) {
            setAlert({
                type: "error",
                message: "Failed to update role",
            })
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader className="animate-spin text-[--primary]" size={40} />
            </div>
        )
    }

    if (!isAuthorized) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-center text-red-500">
                    You don't have permission to access this page.
                </p>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto"
        >
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight mb-2">
                    HR Management {loading && "🔄"}
                </h1>
                <p className="text-[--text-secondary]">
                    All changes sync instantly across the entire system
                    <br />
                    <small className="text-xs text-[--text-muted]">
                        Last sync: {new Date().toLocaleTimeString()}
                    </small>
                </p>
            </div>

            {/* Alert */}
            <AnimatePresence>
                {alert && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`mb-6 p-4 rounded-lg border flex items-center gap-3 ${
                            alert.type === "success"
                                ? "bg-green-500/10 border-green-500/30 text-green-200"
                                : alert.type === "error"
                                ? "bg-red-500/10 border-red-500/30 text-red-200"
                                : "bg-blue-500/10 border-blue-500/30 text-blue-200"
                        }`}
                    >
                        {alert.type === "success" ? (
                            <CheckCircle size={20} />
                        ) : (
                            <AlertCircle size={20} />
                        )}
                        <span>{alert.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-[--border-subtle] overflow-x-auto pb-4">
                {[
                    { id: "employees", label: "👥 Employees" },
                    { id: "create", label: "➕ Add Employee" },
                    { id: "email", label: "📧 Send Email" },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id as any)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                            tab === t.id
                                ? "bg-[--primary] text-white"
                                : "text-[--text-secondary] hover:text-white hover:bg-white/5"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Employees List */}
            {tab === "employees" && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                >
                    <div className="bg-[--surface-1] border border-[--border-default] rounded-xl p-6">
                        <h2 className="text-xl font-bold mb-4">
                            Team Members ({employees.length})
                        </h2>

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader className="animate-spin text-[--primary]" />
                            </div>
                        ) : employees.length === 0 ? (
                            <div className="text-center py-8 text-[--text-muted]">
                                <Users size={48} className="mx-auto opacity-50 mb-4" />
                                <p>No employees yet</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b border-[--border-subtle]">
                                        <tr>
                                            <th className="text-left py-3 px-4">Name</th>
                                            <th className="text-left py-3 px-4">Email</th>
                                            <th className="text-left py-3 px-4">Role</th>
                                            <th className="text-left py-3 px-4">Department</th>
                                            <th className="text-center py-3 px-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[--border-subtle]">
                                        {employees.map((emp: any) => (
                                            <tr
                                                key={emp.id}
                                                className="hover:bg-white/3 transition-colors"
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-[--primary]/25 flex items-center justify-center text-sm font-bold">
                                                            {(emp.name || emp.email)[0].toUpperCase()}
                                                        </div>
                                                        {emp.name || emp.email}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-[--text-secondary]">
                                                    {emp.email}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="px-2 py-1 rounded-lg bg-[--primary]/10 text-[--primary] text-xs font-semibold">
                                                        {emp.role}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-[--text-secondary]">
                                                    {emp.department || "-"}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex gap-2 justify-center">
                                                        <button
                                                            onClick={() =>
                                                                handleUpdateRole(emp.id)
                                                            }
                                                            className="text-blue-400 hover:text-blue-300"
                                                            title="Update role"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleDeleteEmployee(emp.id)
                                                            }
                                                            className="text-red-400 hover:text-red-300"
                                                            title="Remove employee"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Create Employee Tab */}
            {tab === "create" && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid md:grid-cols-2 gap-6"
                >
                    <div className="bg-[--surface-1] border border-[--border-default] rounded-xl p-6">
                        <h2 className="text-xl font-bold mb-6">Create New Employee</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2">
                                    Employee Email
                                </label>
                                <input
                                    type="email"
                                    value={createForm.email}
                                    onChange={(e) =>
                                        setCreateForm({
                                            ...createForm,
                                            email: e.target.value,
                                        })
                                    }
                                    placeholder="employee@company.com"
                                    className="w-full px-3 py-2 bg-white/10 border border-[--border-default] rounded-lg text-white placeholder-[--text-muted] focus:outline-none focus:border-[--primary]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={createForm.name}
                                    onChange={(e) =>
                                        setCreateForm({
                                            ...createForm,
                                            name: e.target.value,
                                        })
                                    }
                                    placeholder="John Doe"
                                    className="w-full px-3 py-2 bg-white/10 border border-[--border-default] rounded-lg text-white placeholder-[--text-muted] focus:outline-none focus:border-[--primary]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2">
                                    Role
                                </label>
                                <select
                                    value={createForm.role}
                                    onChange={(e) =>
                                        setCreateForm({
                                            ...createForm,
                                            role: e.target.value,
                                        })
                                    }
                                    className="w-full px-3 py-2 bg-white/10 border border-[--border-default] rounded-lg text-white focus:outline-none focus:border-[--primary]"
                                >
                                    <option value="SALES">Sales</option>
                                    <option value="FINANCE">Finance</option>
                                    <option value="WAREHOUSE">Warehouse</option>
                                    <option value="HR">HR</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2">
                                    Department
                                </label>
                                <input
                                    type="text"
                                    value={createForm.department}
                                    onChange={(e) =>
                                        setCreateForm({
                                            ...createForm,
                                            department: e.target.value,
                                        })
                                    }
                                    placeholder="Sales"
                                    className="w-full px-3 py-2 bg-white/10 border border-[--border-default] rounded-lg text-white placeholder-[--text-muted] focus:outline-none focus:border-[--primary]"
                                />
                            </div>

                            <button
                                onClick={handleCreateEmployee}
                                disabled={loadingLocal}
                                className="w-full py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loadingLocal ? (
                                    <>
                                        <Loader size={16} className="animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={16} />
                                        Create Employee
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Password Display */}
                    {generatedPassword && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-green-500/10 border border-green-500/30 rounded-xl p-6"
                        >
                            <h3 className="text-lg font-bold mb-4 text-green-200">
                                ✅ Employee Created!
                            </h3>
                            <p className="text-sm text-green-200 mb-4">
                                Temporary password:
                            </p>
                            <div className="bg-black/30 p-3 rounded-lg font-mono text-center text-white break-all">
                                {generatedPassword}
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(generatedPassword)
                                    setAlert({
                                        type: "success",
                                        message: "Password copied!",
                                    })
                                }}
                                className="w-full mt-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                <Copy size={16} />
                                Copy Password
                            </button>
                        </motion.div>
                    )}
                </motion.div>
            )}
        </motion.div>
    )
}
