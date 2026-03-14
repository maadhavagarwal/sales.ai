"use client"

import SafeChart from "@/components/SafeChart"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { Card } from "@/components/ui"

export default function TestChartsPage() {
    const dummyOption = {
        xAxis: {
            type: 'category',
            data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        yAxis: {
            type: 'value'
        },
        series: [
            {
                data: [150, 230, 224, 218, 135, 147, 260],
                type: 'line'
            }
        ]
    };

    return (
        <DashboardLayout title="Chart Diagnostic">
            <div className="p-8">
                <Card variant="glass" padding="lg">
                    <h3 className="mb-4">Diagnostic Chart (Line)</h3>
                    <SafeChart option={dummyOption} />
                </Card>
            </div>
        </DashboardLayout>
    )
}
