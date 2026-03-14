"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, FileSpreadsheet, CheckCircle2, X, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/Toast"

interface AdditionalCSVUploaderProps {
    onUploadComplete?: (result: any) => void
}

export default function AdditionalCSVUploader({ onUploadComplete }: AdditionalCSVUploaderProps) {
    const [files, setFiles] = useState<File[]>([])
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [results, setResults] = useState<any>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { showToast } = useToast()

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files)
            setFiles(prev => [...prev, ...newFiles])
        }
    }

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleUpload = async () => {
        if (files.length === 0) return

        setUploading(true)
        setUploadProgress(0)
        setResults(null)

        try {
            const formData = new FormData()
            files.forEach(file => formData.append('files', file))

            const token = localStorage.getItem('token')
            const response = await fetch('/api/backend/workspace/additional-upload', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) {
                throw new Error('Upload failed')
            }

            const data = await response.json()
            setResults(data)
            setUploadProgress(100)

            showToast("success", "Upload Complete", `${files.length} file(s) processed successfully`)

            if (onUploadComplete) {
                onUploadComplete(data)
            }

            // Clear files after successful upload
            setFiles([])

        } catch (error) {
            console.error('Upload error:', error)
            showToast("error", "Upload Failed", "Failed to upload files. Please try again.")
        } finally {
            setUploading(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const droppedFiles = Array.from(e.dataTransfer.files)
        const validFiles = droppedFiles.filter(file =>
            file.name.endsWith('.csv') ||
            file.name.endsWith('.xlsx') ||
            file.name.endsWith('.xls')
        )
        if (validFiles.length > 0) {
            setFiles(prev => [...prev, ...validFiles])
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">Upload Additional Data</h3>
                <p className="text-slate-400 text-sm">
                    Add more CSV/Excel files to expand your business intelligence
                </p>
            </div>

            {/* Upload Area */}
            <motion.div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                    files.length > 0 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-slate-500'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-white font-medium mb-2">
                        {files.length > 0 ? `${files.length} file(s) selected` : 'Drop files here or click to browse'}
                    </p>
                    <p className="text-slate-400 text-sm">
                        Supports CSV and Excel files (.csv, .xlsx, .xls)
                    </p>
                </div>
            </motion.div>

            {/* File List */}
            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 space-y-2"
                    >
                        <h4 className="text-white font-medium mb-3">Selected Files:</h4>
                        {files.map((file, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                                    <span className="text-white text-sm">{file.name}</span>
                                    <span className="text-slate-400 text-xs">
                                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                    </span>
                                </div>
                                <button
                                    onClick={() => removeFile(index)}
                                    className="text-red-400 hover:text-red-300 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Upload Button */}
            {files.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 text-center"
                >
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 mx-auto ${
                            uploading
                                ? 'bg-slate-600 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing... {uploadProgress}%
                            </>
                        ) : (
                            <>
                                <Upload className="w-5 h-5" />
                                Upload {files.length} File{files.length > 1 ? 's' : ''}
                            </>
                        )}
                    </button>
                </motion.div>
            )}

            {/* Results */}
            <AnimatePresence>
                {results && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mt-6 bg-slate-800/30 rounded-lg p-4"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                            <h4 className="text-white font-medium">Upload Complete</h4>
                        </div>

                        <div className="space-y-2">
                            {results.analysis?.map((item: any, index: number) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                    <span className="text-slate-300">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-blue-400">{item.category}</span>
                                        <span className="text-slate-500">({item.records} records)</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="text-slate-400 text-xs mt-3">
                            All data has been automatically categorized and integrated into your system.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}