"use client"

import { useState } from "react"
import { uploadCSV } from "../services/api"

export default function UploadCSV({ setResults }: any) {

  const [loading, setLoading] = useState(false)

  const handleUpload = async (e: any) => {

    const file = e.target.files[0]

    setLoading(true)

    const data = await uploadCSV(file)

    setResults(data)

    setLoading(false)
  }

  return (
    <div className="p-4 border rounded-lg">

      <input type="file" onChange={handleUpload} />

      {loading && <p>Processing dataset...</p>}

    </div>
  )
}