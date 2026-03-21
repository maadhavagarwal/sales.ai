"use client"

import { useState } from "react"
import { uploadCSV, getUploadStatus } from "../services/api"

export default function UploadCSV({ setResults }: any) {

  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState("")

  const handleUpload = async (e: any) => {

    const file = e.target.files[0]

    setLoading(true)
    setUploadProgress("Uploading file...")

    try {
      // Step 1: Upload file and get dataset_id
      const initialResponse = await uploadCSV(file)
      const { dataset_id, status } = initialResponse

      if (status === "processing") {
        setUploadProgress("File uploaded. Processing in background...")

        // Step 2: Poll for completion
        let isComplete = false
        let attempts = 0
        const maxAttempts = 120 // 2 minutes with 1s intervals

        while (!isComplete && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second

          const statusResponse = await getUploadStatus(dataset_id)

          if (statusResponse.status === "completed") {
            setUploadProgress("Processing complete!")
            setResults(statusResponse)
            isComplete = true
          } else if (statusResponse.status === "error") {
            setUploadProgress(`Error: ${statusResponse.error}`)
            setResults(statusResponse)
            isComplete = true
          }

          attempts++
        }

        if (!isComplete) {
          setUploadProgress("Processing timeout. Results may still be processing.")
          setResults(initialResponse)
        }
      } else {
        // If processing completed immediately (unlikely but possible)
        setResults(initialResponse)
      }
    } catch (error) {
      setUploadProgress(`Upload error: ${error}`)
      console.error("Upload failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg">

      <input type="file" onChange={handleUpload} />

      {loading && <p>{uploadProgress || "Processing dataset..."}</p>}

    </div>
  )
}