"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Building2, Upload, FileSpreadsheet, CheckCircle2, ArrowRight, Mail, Phone, MapPin, Users } from "lucide-react"

export default function Register() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        companyName: "",
        gstin: "",
        industry: "E-Commerce",
        companySize: "50-200",
        hqLocation: "Mumbai, India",
        contactPerson: "",
        phone: "",
        businessType: "Private Limited"
    })
    const [files, setFiles] = useState<File[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles([...files, ...Array.from(e.target.files)])
        }
    }

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index))
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match")
            return
        }
        if (files.length === 0) {
            setError("Please upload at least one business data file")
            return
        }

        setLoading(true)
        setError("")

        try {
            // Step 1: Register user
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/backend"
            const registerRes = await fetch(`${API_URL}/register-enterprise`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    companyDetails: {
                        name: formData.companyName,
                        gstin: formData.gstin,
                        industry: formData.industry,
                        size: formData.companySize,
                        hq_location: formData.hqLocation,
                        contact_person: formData.contactPerson,
                        phone: formData.phone,
                        business_type: formData.businessType
                    }
                })
            })

            if (!registerRes.ok) {
                const data = await registerRes.json()
                setError(data.error || "Registration failed")
                return
            }

            const registerData = await registerRes.json()
            const token = registerData.token

            // Step 2: Upload business data
            const formDataUpload = new FormData()
            files.forEach(file => formDataUpload.append('files', file))

            const uploadRes = await fetch(`${API_URL}/workspace/universal-upload`, {
                method: 'POST',
                body: formDataUpload,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!uploadRes.ok) {
                setError("Registration successful but data upload failed. Please contact support.")
                return
            }

            // Step 3: Complete company profile
            await fetch(`${API_URL}/workspace/company-profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: formData.companyName,
                    gstin: formData.gstin,
                    industry: formData.industry,
                    size: formData.companySize,
                    hq_location: formData.hqLocation,
                    contact_person: formData.contactPerson,
                    phone: formData.phone,
                    business_type: formData.businessType
                })
            })

            setSuccess(true)
            setTimeout(() => {
                router.push("/dashboard")
            }, 3000)

        } catch (err) {
            setError("Cannot connect to server")
        } finally {
            setLoading(false)
        }
    }

    const nextStep = () => {
        if (step === 1 && (!formData.email || !formData.password || !formData.confirmPassword)) {
            setError("Please fill all required fields")
            return
        }
        if (step === 2 && (!formData.companyName || !formData.contactPerson)) {
            setError("Please fill all business details")
            return
        }
        setError("")
        setStep(step + 1)
    }

    const prevStep = () => {
        setStep(step - 1)
        setError("")
    }

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--surface-0)",
            position: "relative",
            padding: "2rem"
        }}>
            {/* Background Mesh */}
            <div style={{
                position: "absolute",
                inset: 0,
                background: "var(--gradient-mesh)",
                opacity: 0.6,
                pointerEvents: "none"
            }} />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card"
                style={{
                    width: "100%",
                    maxWidth: "500px",
                    padding: "3rem 2.5rem",
                    position: "relative",
                    zIndex: 10,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                    border: "1px solid rgba(255,255,255,0.1)"
                }}
            >
                <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
                    <div style={{
                        width: "48px",
                        height: "48px",
                        background: "var(--gradient-primary)",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "1.2rem",
                        margin: "0 auto 1.5rem",
                        boxShadow: "var(--shadow-glow)"
                    }}>
                        AI
                    </div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>Enterprise Registration</h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Step {step} of 3: {step === 1 ? "Account Setup" : step === 2 ? "Business Details" : "Data Upload"}</p>
                </div>

                {/* Progress Bar */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ display: "flex", alignItems: "center" }}>
                            <div style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                background: step >= i ? "var(--primary)" : "rgba(255,255,255,0.1)",
                                color: step >= i ? "white" : "var(--text-secondary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.8rem",
                                fontWeight: "bold"
                            }}>
                                {step > i ? <CheckCircle2 size={16} /> : i}
                            </div>
                            {i < 3 && <div style={{
                                width: "40px",
                                height: "2px",
                                background: step > i ? "var(--primary)" : "rgba(255,255,255,0.1)",
                                margin: "0 8px"
                            }} />}
                        </div>
                    ))}
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                            background: "rgba(239, 68, 68, 0.15)",
                            border: "1px solid #ef4444",
                            color: "#fca5a5",
                            padding: "0.75rem",
                            borderRadius: "8px",
                            fontSize: "0.85rem",
                            marginBottom: "1.5rem",
                            textAlign: "center"
                        }}>
                        {error}
                    </motion.div>
                )}

                {success && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                            background: "rgba(16, 185, 129, 0.15)",
                            border: "1px solid #10b981",
                            color: "#a7f3d0",
                            padding: "0.75rem",
                            borderRadius: "8px",
                            fontSize: "0.85rem",
                            marginBottom: "1.5rem",
                            textAlign: "center"
                        }}>
                        <CheckCircle2 size={16} style={{ display: "inline", marginRight: "8px" }} />
                        Enterprise setup complete! Welcome email sent. Redirecting to dashboard...
                    </motion.div>
                )}

                {/* Step 1: Account Setup */}
                {step === 1 && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
                    >
                        <div>
                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                                <Mail size={14} style={{ display: "inline", marginRight: "8px" }} />
                                Email Address
                            </label>
                            <input
                                type="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="admin@company.com"
                                style={{
                                    width: "100%",
                                    padding: "0.875rem 1rem",
                                    background: "rgba(0,0,0,0.2)",
                                    border: "1px solid var(--border-subtle)",
                                    borderRadius: "var(--radius-md)",
                                    color: "white",
                                    fontSize: "0.95rem",
                                    outline: "none"
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Password</label>
                            <input
                                type="password"
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="••••••••"
                                style={{
                                    width: "100%",
                                    padding: "0.875rem 1rem",
                                    background: "rgba(0,0,0,0.2)",
                                    border: "1px solid var(--border-subtle)",
                                    borderRadius: "var(--radius-md)",
                                    color: "white",
                                    fontSize: "0.95rem",
                                    outline: "none"
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Confirm Password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                required
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                placeholder="••••••••"
                                style={{
                                    width: "100%",
                                    padding: "0.875rem 1rem",
                                    background: "rgba(0,0,0,0.2)",
                                    border: "1px solid var(--border-subtle)",
                                    borderRadius: "var(--radius-md)",
                                    color: "white",
                                    fontSize: "0.95rem",
                                    outline: "none"
                                }}
                            />
                        </div>

                        <button
                            type="button"
                            onClick={nextStep}
                            style={{
                                width: "100%",
                                padding: "0.875rem",
                                background: "var(--gradient-primary)",
                                border: "none",
                                borderRadius: "var(--radius-md)",
                                color: "white",
                                fontSize: "0.95rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px"
                            }}
                        >
                            Next: Business Details <ArrowRight size={16} />
                        </button>
                    </motion.div>
                )}

                {/* Step 2: Business Details */}
                {step === 2 && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
                    >
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                                    <Building2 size={14} style={{ display: "inline", marginRight: "8px" }} />
                                    Company Name
                                </label>
                                <input
                                    type="text"
                                    name="companyName"
                                    required
                                    value={formData.companyName}
                                    onChange={handleInputChange}
                                    placeholder="ABC Corp Ltd"
                                    style={{
                                        width: "100%",
                                        padding: "0.875rem 1rem",
                                        background: "rgba(0,0,0,0.2)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "var(--radius-md)",
                                        color: "white",
                                        fontSize: "0.95rem",
                                        outline: "none"
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>GSTIN</label>
                                <input
                                    type="text"
                                    name="gstin"
                                    value={formData.gstin}
                                    onChange={handleInputChange}
                                    placeholder="27AAAAA0000A1Z5"
                                    style={{
                                        width: "100%",
                                        padding: "0.875rem 1rem",
                                        background: "rgba(0,0,0,0.2)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "var(--radius-md)",
                                        color: "white",
                                        fontSize: "0.95rem",
                                        outline: "none"
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Industry</label>
                                <select
                                    name="industry"
                                    value={formData.industry}
                                    onChange={handleInputChange}
                                    style={{
                                        width: "100%",
                                        padding: "0.875rem 1rem",
                                        background: "rgba(0,0,0,0.2)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "var(--radius-md)",
                                        color: "white",
                                        fontSize: "0.95rem",
                                        outline: "none"
                                    }}
                                >
                                    <option value="E-Commerce">E-Commerce</option>
                                    <option value="Manufacturing">Manufacturing</option>
                                    <option value="Retail">Retail</option>
                                    <option value="Services">Services</option>
                                    <option value="Healthcare">Healthcare</option>
                                    <option value="Education">Education</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                                    <Users size={14} style={{ display: "inline", marginRight: "8px" }} />
                                    Company Size
                                </label>
                                <select
                                    name="companySize"
                                    value={formData.companySize}
                                    onChange={handleInputChange}
                                    style={{
                                        width: "100%",
                                        padding: "0.875rem 1rem",
                                        background: "rgba(0,0,0,0.2)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "var(--radius-md)",
                                        color: "white",
                                        fontSize: "0.95rem",
                                        outline: "none"
                                    }}
                                >
                                    <option value="1-10">1-10 employees</option>
                                    <option value="11-50">11-50 employees</option>
                                    <option value="50-200">50-200 employees</option>
                                    <option value="200-1000">200-1000 employees</option>
                                    <option value="1000+">1000+ employees</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                                    <MapPin size={14} style={{ display: "inline", marginRight: "8px" }} />
                                    HQ Location
                                </label>
                                <input
                                    type="text"
                                    name="hqLocation"
                                    value={formData.hqLocation}
                                    onChange={handleInputChange}
                                    placeholder="Mumbai, India"
                                    style={{
                                        width: "100%",
                                        padding: "0.875rem 1rem",
                                        background: "rgba(0,0,0,0.2)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "var(--radius-md)",
                                        color: "white",
                                        fontSize: "0.95rem",
                                        outline: "none"
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Business Type</label>
                                <select
                                    name="businessType"
                                    value={formData.businessType}
                                    onChange={handleInputChange}
                                    style={{
                                        width: "100%",
                                        padding: "0.875rem 1rem",
                                        background: "rgba(0,0,0,0.2)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "var(--radius-md)",
                                        color: "white",
                                        fontSize: "0.95rem",
                                        outline: "none"
                                    }}
                                >
                                    <option value="Private Limited">Private Limited</option>
                                    <option value="Public Limited">Public Limited</option>
                                    <option value="Partnership">Partnership</option>
                                    <option value="Proprietorship">Proprietorship</option>
                                    <option value="LLP">LLP</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Contact Person</label>
                                <input
                                    type="text"
                                    name="contactPerson"
                                    required
                                    value={formData.contactPerson}
                                    onChange={handleInputChange}
                                    placeholder="John Doe"
                                    style={{
                                        width: "100%",
                                        padding: "0.875rem 1rem",
                                        background: "rgba(0,0,0,0.2)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "var(--radius-md)",
                                        color: "white",
                                        fontSize: "0.95rem",
                                        outline: "none"
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                                    <Phone size={14} style={{ display: "inline", marginRight: "8px" }} />
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="+91 9876543210"
                                    style={{
                                        width: "100%",
                                        padding: "0.875rem 1rem",
                                        background: "rgba(0,0,0,0.2)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "var(--radius-md)",
                                        color: "white",
                                        fontSize: "0.95rem",
                                        outline: "none"
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                            <button
                                type="button"
                                onClick={prevStep}
                                style={{
                                    flex: 1,
                                    padding: "0.875rem",
                                    background: "rgba(255,255,255,0.1)",
                                    border: "1px solid var(--border-subtle)",
                                    borderRadius: "var(--radius-md)",
                                    color: "white",
                                    fontSize: "0.95rem",
                                    fontWeight: 600,
                                    cursor: "pointer"
                                }}
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={nextStep}
                                style={{
                                    flex: 1,
                                    padding: "0.875rem",
                                    background: "var(--gradient-primary)",
                                    border: "none",
                                    borderRadius: "var(--radius-md)",
                                    color: "white",
                                    fontSize: "0.95rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px"
                                }}
                            >
                                Next: Data Upload <ArrowRight size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Step 3: Data Upload */}
                {step === 3 && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
                    >
                        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                            <Upload size={32} style={{ color: "var(--primary)", margin: "0 auto 1rem" }} />
                            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Upload Your Business Data</h3>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                Upload CSV/Excel files containing your invoices, customers, inventory, or other business data.
                                Our AI will automatically categorize and integrate everything.
                            </p>
                        </div>

                        <div
                            style={{
                                border: "2px dashed var(--border-subtle)",
                                borderRadius: "var(--radius-md)",
                                padding: "2rem",
                                textAlign: "center",
                                background: "rgba(0,0,0,0.1)",
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                            onClick={() => document.getElementById('file-upload')?.click()}
                        >
                            <FileSpreadsheet size={24} style={{ color: "var(--text-secondary)", margin: "0 auto 1rem" }} />
                            <p style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Click to upload files</p>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>CSV, Excel files supported</p>
                            <input
                                id="file-upload"
                                type="file"
                                multiple
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileUpload}
                                style={{ display: "none" }}
                            />
                        </div>

                        {files.length > 0 && (
                            <div style={{ marginTop: "1rem" }}>
                                <h4 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Uploaded Files:</h4>
                                {files.map((file, index) => (
                                    <div key={index} style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "0.5rem",
                                        background: "rgba(0,0,0,0.2)",
                                        borderRadius: "var(--radius-sm)",
                                        marginBottom: "0.5rem"
                                    }}>
                                        <span style={{ fontSize: "0.85rem" }}>{file.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "#ef4444",
                                                cursor: "pointer",
                                                padding: "4px"
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                            <button
                                type="button"
                                onClick={prevStep}
                                style={{
                                    flex: 1,
                                    padding: "0.875rem",
                                    background: "rgba(255,255,255,0.1)",
                                    border: "1px solid var(--border-subtle)",
                                    borderRadius: "var(--radius-md)",
                                    color: "white",
                                    fontSize: "0.95rem",
                                    fontWeight: 600,
                                    cursor: "pointer"
                                }}
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={loading || files.length === 0}
                                style={{
                                    flex: 1,
                                    padding: "0.875rem",
                                    background: loading ? "rgba(255,255,255,0.2)" : "var(--gradient-primary)",
                                    border: "none",
                                    borderRadius: "var(--radius-md)",
                                    color: "white",
                                    fontSize: "0.95rem",
                                    fontWeight: 600,
                                    cursor: loading ? "not-allowed" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px"
                                }}
                            >
                                {loading ? "Setting up..." : "Complete Registration"}
                                {!loading && <CheckCircle2 size={16} />}
                            </button>
                        </div>
                    </motion.div>
                )}

                <div style={{ textAlign: "center", marginTop: "2rem" }}>
                    <Link href="/login" style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        Already have an account? Sign in
                    </Link>
                </div>
            </motion.div>
        </div>
    )
}
