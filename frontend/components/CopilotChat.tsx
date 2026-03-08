"use client"

import { useState } from "react"
import { askCopilot } from "../services/api"
import { useStore } from "../store/useStore"

export default function CopilotChat() {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const datasetId = useStore((state) => state.datasetId)

  const ask = async () => {
    if (!datasetId) return
    const res = await askCopilot(datasetId, question)
    setAnswer(res.answer)
  }

  return (
    <div className="mt-6">

      <h2 className="text-xl font-bold">AI Copilot</h2>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="border p-2"
      />

      <button onClick={ask} className="ml-2 bg-blue-500 text-white px-3 py-2">
        Ask
      </button>

      {answer && <p className="mt-4">{answer}</p>}

    </div>
  )
}