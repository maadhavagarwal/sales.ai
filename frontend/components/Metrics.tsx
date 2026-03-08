export default function Metrics({ analytics }: any) {

  if (!analytics) return null

  return (
    <div className="grid grid-cols-3 gap-6 mt-6">

      <div className="bg-gray-900 p-6 rounded-xl">
        <p>Total Revenue</p>
        <h2 className="text-2xl font-bold">
          {analytics.total_revenue}
        </h2>
      </div>

      <div className="bg-gray-900 p-6 rounded-xl">
        <p>Average Revenue</p>
        <h2 className="text-2xl font-bold">
          {analytics.average_revenue}
        </h2>
      </div>

    </div>
  )
}