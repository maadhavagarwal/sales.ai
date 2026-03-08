export default function StrategyPanel({ strategy }: any) {

  if (!strategy) return null

  return (
    <div>

      <h2 className="text-xl font-bold">AI Strategy</h2>

      {strategy.map((s: string, i: number) => (
        <p key={i}>• {s}</p>
      ))}

    </div>
  )
}