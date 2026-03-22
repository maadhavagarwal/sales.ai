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
import { useStore } from "@/store/useStore"
import { useRouter } from "next/navigation"
import { useRoleAccess } from "@/hooks/useRoleAccess"

interface Employee {
    id: number
    email: string
    name?: string
    role: string
    department?: string
    status?: string
    created_at?: string
}

interface AlertMessage {
    type: "success" | "error" | "info"
    message: string
}

export default function HRPage() {
    const router = useRouter()
    const { userRole, userEmail } = useStore()
    const { isAuthorized, isLoading } = useRoleAccess(["ADMIN", "HR"])
    const [tab, setTab] = useState<"employees" | "create" | "email">("employees")
    const [employees, setEmployees] = useState<Employee[]>([])
    const [loading, setLoading] = useState(false)
    const [alert, setAlert] = useState<AlertMessage | null>(null)

    // Form states
    const [createForm, setCreateForm] = useState({
        email: "",
        name: "",
        role: "SALES",
        department: "Sales",
        message: "",
        send_email: true,
    })

    const [updateForm, setUpdateForm] = useState({
        employee_id: 0,
        role: "SALES",
    })

    const [emailForm, setEmailForm] = useState({
        recipient_email: "",
        subject: "",
        message: "",
        action_type: "notification",
    })

    const [copiedPassword, setCopiedPassword] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState<string | null>(null)
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)

    // Check auth
    useEffect(() => {
        if (isLoading || !isAuthorized) return
    }, [isLoading, isAuthorized])

    // Fetch employees
    const fetchEmployees = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem("auth_token")
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "/api/backend"}/v1/hr/employees/list`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            if (response.ok) {
                const data = await response.json()
                setEmployees(data.employees || [])
            }
        } catch (error) {
            console.error("Error fetching employees:", error)
            setAlert({
                type: "error",
                message: "Failed to fetch employees",
            })
        } finally {
            setLoading(false)
        }
    }

    // Load employees on mount
    useEffect(() => {
        if (tab === "employees") {
            fetchEmployees()
        }
    }, [tab])

    // Create employee
    const handleCreateEmployee = async () => {
        if (!createForm.email || !createForm.name) {
            setAlert({
                type: "error",
                message: "Please fill in email and name",
            })
            return
        }

        setLoading(true)
        try {
            const token = localStorage.getItem("auth_token")
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "/api/backend"}/v1/hr/employees/create`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(createForm),
                }
            )

            const data = await response.json()

            if (response.ok) {
                setGeneratedPassword(data.user?.temp_password)
                setAlert({
                    type: "success",
                    message: data.message || "Employee created successfully",
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

                // Refresh employees list
                setTimeout(() => fetchEmployees(), 1000)
            } else {
                setAlert({
                    type: "error",
                    message: data.detail || "Failed to create employee",
                })
            }
        } catch (error) {
            console.error("Error creating employee:", error)
            setAlert({
                type: "error",
                message: "Network error. Please try again.",
            })
        } finally {
            setLoading(false)
        }
    }

    // Update employee role
    const handleUpdateRole = async (employee: Employee) => {
        setUpdateForm({
            employee_id: employee.id,
            role: employee.role,
        })
    }

    const submitUpdateRole = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem("auth_token")
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "/api/backend"}/v1/hr/employees/update-role`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(updateForm),
                }
            )

            if (response.ok) {
                setAlert({
                    type: "success",
                    message: "Employee role updated successfully",
                })
                setUpdateForm({ employee_id: 0, role: "SALES" })
                fetchEmployees()
            } else {
                const error = await response.json()
                setAlert({
                    type: "error",
                    message: error.detail || "Failed to update role",
                })
            }
        } catch (error) {
            setAlert({
                type: "error",
                message: "Network error",
            })
        } finally {
            setLoading(false)
        }
    }

    // Delete employee
    const handleDeleteEmployee = async (employeeId: number) => {
        if (!confirm("Are you sure you want to remove this employee?")) return

        setLoading(true)
        try {
            const token = localStorage.getItem("auth_token")
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "/api/backend"}/v1/hr/employees/delete/${employeeId}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            if (response.ok) {
                setAlert({
                    type: "success",
                    message: "Employee removed successfully",
                })
                fetchEmployees()
            } else {
                const error = await response.json()
                setAlert({
                    type: "error",
                    message: error.detail || "Failed to delete employee",
                })
            }
        } catch (error) {
            setAlert({
                type: "error",
                message: "Network error",
            })
        } finally {
            setLoading(false)
        }
    }

    // Send credential email
    const handleSendCredential = async () => {
        if (
            !emailForm.recipient_email ||
            !generatedPassword ||
            !createForm.name
        ) {
            setAlert({
                type: "error",
                message: "Missing required information",
            })
            return
        }

        setLoading(true)
        try {
            const token = localStorage.getItem("auth_token")
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "/api/backend"}/v1/hr/emails/send-credential`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        email: emailForm.recipient_email,
                        name: createForm.name,
                        password: generatedPassword,
                        message: emailForm.message,
                    }),
                }
            )

            const data = await response.json()

            if (response.ok) {
                setAlert({
                    type: "success",
                    message: "Credentials sent successfully",
                })
                setGeneratedPassword(null)
                setEmailForm({
                    recipient_email: "",
                    subject: "",
                    message: "",
                    action_type: "notification",
                })
            } else {
                setAlert({
                    type: "error",
                    message: data.detail || "Failed to send email",
                })
            }
        } catch (error) {
            setAlert({
                type: "error",
                message: "Network error",
            })
        } finally {
            setLoading(false)
        }
    }

    // Send HR notification
    const handleSendNotification = async () => {
        if (!emailForm.subject || !emailForm.message) {
            setAlert({
                type: "error",
                message: "Please fill in subject and message",
            })
            return
        }

        setLoading(true)
        try {
            const token = localStorage.getItem("auth_token")
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "/api/backend"}/v1/hr/emails/send-hr-notification`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        hr_email: userEmail,
                        subject: emailForm.subject,
                        message: emailForm.message,
                        recipient_email: emailForm.recipient_email,
                        action_type: emailForm.action_type,
                    }),
                }
            )

            const data = await response.json()

            if (response.ok) {
                setAlert({
                    type: "success",
                    message: "Notification sent successfully",
                })
                setEmailForm({
                    recipient_email: "",
                    subject: "",
                    message: "",
                    action_type: "notification",
                })
            } else {
                setAlert({
                    type: "error",
                    message: data.detail || "Failed to send notification",
                })
            }
        } catch (error) {
            setAlert({
                type: "error",
                message: "Network error",
            })
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedPassword(id)
        setTimeout(() => setCopiedPassword(null), 2000)
    }

    return (
        <div className="min-h-screen bg-[--surface-0] text-white p-6">
            {isLoading ? (
                <div className="flex items-center justify-center min-h-screen">
                    <Loader className="animate-spin text-[--primary]" size={48} />
                </div>
            ) : !isAuthorized ? (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
                        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                        <p className="text-[--text-secondary]">
                            You don&apos;t have permission to access this page.
                        </p>
                    </div>
                </div>
            ) : (
                <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto"
            >
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold tracking-tight mb-2">
                        HR Management
                    </h1>
                    <p className="text-[--text-secondary]">
                        Manage employees, credentials, and HR communications
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
                        { id: "employees", label: "👥 Employees", icon: Users },
                        { id: "create", label: "➕ Add Employee", icon: Plus },
                        { id: "email", label: "📧 Send Email", icon: Mail },
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

                {/* Content */}
                <div className="grid gap-6">
                    {/* Employees List Tab */}
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
                                                    <th className="text-left py-3 px-4">Status</th>
                                                    <th className="text-center py-3 px-4">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[--border-subtle]">
                                                {employees.map((emp) => (
                                                    <tr
                                                        key={emp.id}
                                                        className="hover:bg-white/3 transition-colors"
                                                    >
                                                        <td className="py-3 px-4 flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-[--primary]/25 flex items-center justify-center text-sm font-bold">
                                                                {(emp.name ||
                                                                    emp.email)[0].toUpperCase()}
                                                            </div>
                                                            {emp.name || emp.email}
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-[--text-secondary]">
                                                            {emp.email}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className="bg-purple-500/20 text-purple-200 px-2 py-1 rounded text-xs font-semibold">
                                                                {emp.role}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-sm">
                                                            {emp.department || "-"}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span
                                                                className={`text-xs px-2 py-1 rounded ${
                                                                    emp.status === "Active"
                                                                        ? "bg-green-500/20 text-green-200"
                                                                        : "bg-yellow-500/20 text-yellow-200"
                                                                }`}
                                                            >
                                                                {emp.status || "Active"}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-center space-x-2">
                                                            <button
                                                                onClick={() =>
                                                                    handleUpdateRole(emp)
                                                                }
                                                                className="text-blue-400 hover:text-blue-300"
                                                                title="Update role"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    handleDeleteEmployee(
                                                                        emp.id
                                                                    )
                                                                }
                                                                className="text-red-400 hover:text-red-300"
                                                                title="Remove employee"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
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
                                <h2 className="text-xl font-bold mb-6">
                                    Create New Employee
                                </h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">
                                            Employee Email *
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
                                            Full Name *
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

                                    <div>
                                        <label className="block text-sm font-semibold mb-2">
                                            Welcome Message (Optional)
                                        </label>
                                        <textarea
                                            value={createForm.message}
                                            onChange={(e) =>
                                                setCreateForm({
                                                    ...createForm,
                                                    message: e.target.value,
                                                })
                                            }
                                            placeholder="Add a custom welcome message for the employee..."
                                            className="w-full px-3 py-2 bg-white/10 border border-[--border-default] rounded-lg text-white placeholder-[--text-muted] focus:outline-none focus:border-[--primary] h-24 resize-none"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={createForm.send_email}
                                            onChange={(e) =>
                                                setCreateForm({
                                                    ...createForm,
                                                    send_email: e.target.checked,
                                                })
                                            }
                                            id="send_email"
                                        />
                                        <label
                                            htmlFor="send_email"
                                            className="text-sm font-semibold"
                                        >
                                            Send credentials via email immediately
                                        </label>
                                    </div>

                                    <button
                                        onClick={handleCreateEmployee}
                                        disabled={loading}
                                        className="w-full py-3 bg-gradient-to-r from-[--primary] to-purple-600 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
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

                            {/* Generated Password Display */}
                            {generatedPassword && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6"
                                >
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <CheckCircle size={20} className="text-green-400" />
                                        Temporary Credentials Generated
                                    </h3>

                                    <div className="space-y-4 mb-6">
                                        <div className="bg-[--surface-0]/50 p-4 rounded-lg border border-green-500/20">
                                            <div className="text-xs text-[--text-muted] mb-1">
                                                TEMPORARY PASSWORD
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 text-sm font-mono text-green-300">
                                                    {showPassword === "temp"
                                                        ? generatedPassword
                                                        : "••••••••••••"}
                                                </code>
                                                <button
                                                    onClick={() =>
                                                        setShowPassword(
                                                            showPassword === "temp"
                                                                ? null
                                                                : "temp"
                                                        )
                                                    }
                                                    className="p-1 hover:bg-white/10 rounded"
                                                >
                                                    {showPassword === "temp" ? (
                                                        <EyeOff size={16} />
                                                    ) : (
                                                        <Eye size={16} />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            generatedPassword,
                                                            "password"
                                                        )
                                                    }
                                                    className="p-1 hover:bg-white/10 rounded"
                                                >
                                                    {copiedPassword === "password" ? (
                                                        <CheckCircle
                                                            size={16}
                                                            className="text-green-400"
                                                        />
                                                    ) : (
                                                        <Copy size={16} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-sm text-yellow-200 flex items-start gap-2">
                                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                            <span>
                                                Employee will be required to change password on
                                                first login
                                            </span>
                                        </p>
                                    </div>

                                    <button
                                        onClick={() =>
                                            setEmailForm({
                                                ...emailForm,
                                                recipient_email:
                                                    createForm.email,
                                            })
                                        }
                                        className="w-full py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Mail size={16} />
                                        Send Credentials Email
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* Email Tab */}
                    {tab === "email" && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-[--surface-1] border border-[--border-default] rounded-xl p-6"
                        >
                            <h2 className="text-xl font-bold mb-6">Send HR Email</h2>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">
                                            Recipient Email
                                        </label>
                                        <input
                                            type="email"
                                            value={emailForm.recipient_email}
                                            onChange={(e) =>
                                                setEmailForm({
                                                    ...emailForm,
                                                    recipient_email:
                                                        e.target.value,
                                                })
                                            }
                                            placeholder="employee@company.com"
                                            className="w-full px-3 py-2 bg-white/10 border border-[--border-default] rounded-lg text-white placeholder-[--text-muted] focus:outline-none focus:border-[--primary]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold mb-2">
                                            Email Type
                                        </label>
                                        <select
                                            value={emailForm.action_type}
                                            onChange={(e) =>
                                                setEmailForm({
                                                    ...emailForm,
                                                    action_type: e.target.value,
                                                })
                                            }
                                            className="w-full px-3 py-2 bg-white/10 border border-[--border-default] rounded-lg text-white focus:outline-none focus:border-[--primary]"
                                        >
                                            <option value="notification">
                                                HR Notification
                                            </option>
                                            <option value="approval">
                                                Approval Request
                                            </option>
                                            <option value="request">
                                                Information Request
                                            </option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">
                                            Subject *
                                        </label>
                                        <input
                                            type="text"
                                            value={emailForm.subject}
                                            onChange={(e) =>
                                                setEmailForm({
                                                    ...emailForm,
                                                    subject: e.target.value,
                                                })
                                            }
                                            placeholder="Email subject"
                                            className="w-full px-3 py-2 bg-white/10 border border-[--border-default] rounded-lg text-white placeholder-[--text-muted] focus:outline-none focus:border-[--primary]"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold mb-2">
                                        Message *
                                    </label>
                                    <textarea
                                        value={emailForm.message}
                                        onChange={(e) =>
                                            setEmailForm({
                                                ...emailForm,
                                                message: e.target.value,
                                            })
                                        }
                                        placeholder="Type your message here..."
                                        className="w-full px-3 py-2 bg-white/10 border border-[--border-default] rounded-lg text-white placeholder-[--text-muted] focus:outline-none focus:border-[--primary] h-32 resize-none"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <button
                                        onClick={handleSendNotification}
                                        disabled={loading}
                                        className="w-full py-3 bg-gradient-to-r from-[--primary] to-blue-600 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader
                                                    size={16}
                                                    className="animate-spin"
                                                />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send size={16} />
                                                Send Email
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
            )}
        </div>
    )
}
