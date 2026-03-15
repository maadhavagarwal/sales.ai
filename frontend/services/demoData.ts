// Demo Data Service - Populates the system with sample data for demonstration

export interface DemoData {
  customers: any[]
  invoices: any[]
  inventory: any[]
  salesData: any[]
  analytics: any
  kpis: any
}

// Sample customer data
const demoCustomers = [
  {
    id: 1,
    name: "TechCorp Solutions",
    email: "contact@techcorp.com",
    phone: "+1-555-0101",
    address: "123 Tech Street, Silicon Valley, CA",
    type: "Enterprise",
    status: "Active",
    totalOrders: 45,
    totalRevenue: 125000,
    lastOrder: "2024-03-10",
    creditLimit: 50000
  },
  {
    id: 2,
    name: "Global Industries Ltd",
    email: "sales@globalind.com",
    phone: "+1-555-0102",
    address: "456 Industrial Ave, Chicago, IL",
    type: "Corporate",
    status: "Active",
    totalOrders: 32,
    totalRevenue: 89000,
    lastOrder: "2024-03-08",
    creditLimit: 35000
  },
  {
    id: 3,
    name: "StartupXYZ",
    email: "hello@startupxyz.com",
    phone: "+1-555-0103",
    address: "789 Innovation Blvd, Austin, TX",
    type: "Startup",
    status: "Active",
    totalOrders: 18,
    totalRevenue: 45000,
    lastOrder: "2024-03-12",
    creditLimit: 15000
  },
  {
    id: 4,
    name: "RetailChain Inc",
    email: "orders@retailchain.com",
    phone: "+1-555-0104",
    address: "321 Commerce St, New York, NY",
    type: "Retail",
    status: "Active",
    totalOrders: 67,
    totalRevenue: 156000,
    lastOrder: "2024-03-09",
    creditLimit: 75000
  },
  {
    id: 5,
    name: "Manufacturing Plus",
    email: "procurement@mfgplus.com",
    phone: "+1-555-0105",
    address: "654 Factory Lane, Detroit, MI",
    type: "Manufacturing",
    status: "Active",
    totalOrders: 28,
    totalRevenue: 78000,
    lastOrder: "2024-03-11",
    creditLimit: 40000
  }
]

// Sample invoice data
const demoInvoices = [
  {
    id: "INV-2024-001",
    customerId: 1,
    customerName: "TechCorp Solutions",
    amount: 25000,
    status: "paid",
    issueDate: "2024-03-01",
    dueDate: "2024-03-31",
    paidDate: "2024-03-15",
    items: [
      { description: "Software License", quantity: 1, rate: 20000, amount: 20000 },
      { description: "Implementation Services", quantity: 20, rate: 250, amount: 5000 }
    ]
  },
  {
    id: "INV-2024-002",
    customerId: 2,
    customerName: "Global Industries Ltd",
    amount: 18500,
    status: "pending",
    issueDate: "2024-03-05",
    dueDate: "2024-04-05",
    items: [
      { description: "Consulting Services", quantity: 15, rate: 300, amount: 4500 },
      { description: "Training Program", quantity: 1, rate: 14000, amount: 14000 }
    ]
  },
  {
    id: "INV-2024-003",
    customerId: 3,
    customerName: "StartupXYZ",
    amount: 12500,
    status: "paid",
    issueDate: "2024-03-08",
    dueDate: "2024-04-08",
    paidDate: "2024-03-12",
    items: [
      { description: "Cloud Infrastructure", quantity: 1, rate: 8000, amount: 8000 },
      { description: "Support Package", quantity: 12, rate: 375, amount: 4500 }
    ]
  },
  {
    id: "INV-2024-004",
    customerId: 4,
    customerName: "RetailChain Inc",
    amount: 32000,
    status: "overdue",
    issueDate: "2024-02-20",
    dueDate: "2024-03-20",
    items: [
      { description: "POS System License", quantity: 5, rate: 4000, amount: 20000 },
      { description: "Installation & Setup", quantity: 1, rate: 12000, amount: 12000 }
    ]
  },
  {
    id: "INV-2024-005",
    customerId: 5,
    customerName: "Manufacturing Plus",
    amount: 9500,
    status: "paid",
    issueDate: "2024-03-10",
    dueDate: "2024-04-10",
    paidDate: "2024-03-14",
    items: [
      { description: "ERP Module", quantity: 1, rate: 7500, amount: 7500 },
      { description: "Data Migration", quantity: 1, rate: 2000, amount: 2000 }
    ]
  }
]

// Sample inventory data
const demoInventory = [
  {
    id: 1,
    name: "Wireless Router Pro",
    sku: "WR-PRO-001",
    category: "Networking",
    quantity: 45,
    unitCost: 89.99,
    unitPrice: 149.99,
    supplier: "TechSupply Inc",
    location: "Warehouse A",
    minStock: 10,
    maxStock: 100,
    status: "In Stock"
  },
  {
    id: 2,
    name: "Mechanical Keyboard",
    sku: "KB-MECH-002",
    category: "Peripherals",
    quantity: 78,
    unitCost: 65.50,
    unitPrice: 129.99,
    supplier: "Input Devices Co",
    location: "Warehouse B",
    minStock: 15,
    maxStock: 150,
    status: "In Stock"
  },
  {
    id: 3,
    name: "27\" 4K Monitor",
    sku: "MON-4K-003",
    category: "Displays",
    quantity: 12,
    unitCost: 299.99,
    unitPrice: 499.99,
    supplier: "DisplayTech Ltd",
    location: "Warehouse A",
    minStock: 5,
    maxStock: 50,
    status: "Low Stock"
  },
  {
    id: 4,
    name: "SSD 1TB NVMe",
    sku: "SSD-1TB-004",
    category: "Storage",
    quantity: 0,
    unitCost: 89.99,
    unitPrice: 159.99,
    supplier: "Storage Solutions",
    location: "Warehouse C",
    minStock: 8,
    maxStock: 80,
    status: "Out of Stock"
  },
  {
    id: 5,
    name: "USB-C Hub 7-in-1",
    sku: "HUB-USBC-005",
    category: "Accessories",
    quantity: 156,
    unitCost: 24.99,
    unitPrice: 49.99,
    supplier: "Accessory World",
    location: "Warehouse B",
    minStock: 20,
    maxStock: 200,
    status: "In Stock"
  }
]

// Sample sales data for analytics
const demoSalesData = [
  { date: "2024-01-01", revenue: 12500, orders: 8, customers: 6, category: "Electronics" },
  { date: "2024-01-02", revenue: 15200, orders: 12, customers: 9, category: "Electronics" },
  { date: "2024-01-03", revenue: 18900, orders: 15, customers: 11, category: "Electronics" },
  { date: "2024-01-04", revenue: 22100, orders: 18, customers: 13, category: "Electronics" },
  { date: "2024-01-05", revenue: 19800, orders: 16, customers: 12, category: "Electronics" },
  { date: "2024-01-06", revenue: 25600, orders: 22, customers: 17, category: "Electronics" },
  { date: "2024-01-07", revenue: 28900, orders: 25, customers: 19, category: "Electronics" },
  { date: "2024-01-08", revenue: 31200, orders: 28, customers: 21, category: "Electronics" },
  { date: "2024-01-09", revenue: 27800, orders: 24, customers: 18, category: "Electronics" },
  { date: "2024-01-10", revenue: 33400, orders: 31, customers: 24, category: "Electronics" },
]

// Sample analytics data
const demoAnalytics = {
  total_revenue: 2450000,
  total_orders: 1847,
  total_customers: 342,
  average_order_value: 1326,
  monthly_growth: 12.4,
  average_margin: 68.5,
  top_products: {
    "Wireless Router Pro": 125000,
    "Mechanical Keyboard": 89000,
    "27\" 4K Monitor": 156000,
    "SSD 1TB NVMe": 98000,
    "USB-C Hub 7-in-1": 45000
  },
  region_sales: {
    "North America": 1450000,
    "Europe": 560000,
    "Asia Pacific": 330000,
    "Latin America": 110000
  }
}

// Sample KPI data
const demoKPIs = {
  kpis: {
    total_revenue: { value: 2450000, change: 12.4, trend: "up" },
    total_orders: { value: 1847, change: 8.7, trend: "up" },
    total_customers: { value: 342, change: 15.2, trend: "up" },
    average_order_value: { value: 1326, change: 3.1, trend: "up" },
    monthly_recurring_revenue: { value: 185000, change: 22.1, trend: "up" },
    customer_acquisition_cost: { value: 89, change: -5.3, trend: "down" },
    customer_lifetime_value: { value: 7150, change: 8.9, trend: "up" },
    churn_rate: { value: 2.4, change: -0.8, trend: "down" },
    gross_margin: { value: 68.5, change: 2.1, trend: "up" },
    net_profit_margin: { value: 23.4, change: 1.7, trend: "up" }
  },
  last_updated: new Date().toISOString()
}

// Full Dashboard Results Object for Demo Mode
export const demoResults: any = {
  dataset_id: "DEMO-001",
  rows: 1500,
  analytics: demoAnalytics,
  ml_predictions: {
    forecast: {
      forecast: [
        { date: "2024-04", predicted_revenue: 2650000 },
        { date: "2024-05", predicted_revenue: 2820000 },
        { date: "2024-06", predicted_revenue: 2950000 }
      ]
    },
    automl_results: { best_score: 0.92 }
  },
  simulation_results: [
    { scenario: "Optimized Pricing", estimated_revenue: 2850000 },
    { scenario: "Market Expansion", estimated_revenue: 3100000 }
  ],
  recommendations: [
    "Increase stock for 'Wireless Router Pro' by 15%",
    "Launch loyalty campaign for Enterprise segment",
    "Optimize logistics in Asia Pacific region"
  ],
  strategy: [
    "Focus on high-margin networking assets",
    "Consolidate warehouse operations in Warehouse A",
    "Implement dynamic pricing for display categories"
  ],
  insights: [
    "Revenue peak expected in Q3 2024",
    "Customer churn risk reduced by 5%",
    "Operating margins stabilized at 68%"
  ],
  market_intelligence: {
    pcr: { pcr_oi: 1.15, pcr_vol: 0.98, sentiment: "Bullish Accumulation" },
    indicators: [
      { rsi: 64.2, bb_upper: 155.5, bb_lower: 148.2, delta: 0.521, gamma: 0.0235, vega: 0.16, theta: -0.075, rho: 0.014 }
    ]
  },
  explanations: [
    "Growth driven by enterprise expansion",
    "Margin boost due to supply chain optimization"
  ],
  analyst_report: {
    profile: {
      rows: 1500,
      columns: ["date", "revenue", "product", "region", "customer"],
      missing_values: {}
    },
    simulations: [],
    insights: ["Healthy growth trajectory", "Operational efficiency improved"],
    report: "### Executive Summary\nThe enterprise demonstrates a robust growth pattern with a 12.4% monthly expansion. Capital allocation should prioritize high-velocity assets in the networking segment."
  },
  confidence_score: 0.89,
  data_quality: 0.98,
  dataset_type: "sales_dataset"
}

// Sample Intelligence Data
export const demoIntelligence = {
  anomalies: [
    {
      metric: "Revenue",
      severity: "CRITICAL",
      date: "2024-03-12",
      insight: "Sudden 45% drop in recurring revenue from high-value accounts.",
      recommendation: "Immediate outreach to account managers for 'TechCorp' and 'Global Industries'."
    },
    {
      metric: "Margin",
      severity: "WARNING",
      date: "2024-03-14",
      insight: "Input costs for display components risen by 12% across all suppliers.",
      recommendation: "Adjust MSRP for display categories or renegotiate bulk contracts."
    }
  ],
  cashFlow: {
    current_balance: 1450000,
    risk_assessment: "STABLE",
    insight: "Healthy cash reserves to cover operational expenses for the next 120 days.",
    forecast_90d: [
      { date: "2024-04-01", projected_cash: 1520000, is_gap: false },
      { date: "2024-05-01", projected_cash: 1680000, is_gap: false },
      { date: "2024-06-01", projected_cash: 1420000, is_gap: false }
    ]
  },
  scenarios: [
    { case: "Bull", revenue: 3200000, desc: "High market adoption of networking pro line.", assumptions: "15% market share capture." },
    { case: "Base", revenue: 2450000, desc: "Steady growth based on historical trends.", assumptions: "Normal economic conditions." },
    { case: "Bear", revenue: 1900000, desc: "Supply chain disruptions in display components.", assumptions: "10% decrease in inventory velocity." }
  ],
  leaderboard: [
    { name: "John Doe", performance: 125, sales: 850000 },
    { name: "Jane Smith", performance: 112, sales: 720000 },
    { name: "Mike Johnson", performance: 98, sales: 650000 }
  ],
  leadScores: [
    { name: "Acme Corp", score: 94, reason: "High interaction and budget alignment" },
    { name: "Rocket Systems", score: 82, reason: "Recent expansion signs found in news" },
    { name: "Cyberdyne", score: 45, reason: "Low engagement in last 30 days" }
  ],
  churnRisks: [
    { name: "Legacy Soft", risk: "CRITICAL", probability: 0.89, alert: "Technical debt blockers detected" },
    { name: "Standard Bank", risk: "MODERATE", probability: 0.42, alert: "Price sensitivity mentions in email" }
  ],
  inventoryForecast: [
    { sku: "WR-PRO-001", days_to_stockout: 3.5, risk: "CRITICAL", recommended_order: 150 },
    { sku: "KB-MECH-002", days_to_stockout: 12.8, risk: "MODERATE", recommended_order: 50 }
  ],
  fraudAlerts: [
    { id: "TX-9912", amount: 1500000, reason: "Geometric velocity outlier in Mumbai cluster", severity: "CRITICAL" }
  ]
}

// Demo data object
export const demoData: DemoData = {
  customers: demoCustomers,
  invoices: demoInvoices,
  inventory: demoInventory,
  salesData: demoSalesData,
  analytics: demoAnalytics,
  kpis: demoKPIs
}

// Function to load demo data into the application
export const loadDemoData = async (): Promise<DemoData> => {
  // Simulate API calls to load demo data
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(demoData)
    }, 1500) // Simulate loading time
  })
}

// Function to get demo data for specific modules
export const getDemoCustomers = () => demoCustomers
export const getDemoInvoices = () => demoInvoices
export const getDemoInventory = () => demoInventory
export const getDemoSalesData = () => demoSalesData
export const getDemoAnalytics = () => demoAnalytics
export const getDemoKPIs = () => demoKPIs

// Function to check if demo mode is active
export const isDemoMode = (): boolean => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('neuralbi_demo_mode') === 'true'
  }
  return false
}

// Function to enable demo mode
export const enableDemoMode = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('neuralbi_demo_mode', 'true')
  }
}

// Function to disable demo mode
export const disableDemoMode = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('neuralbi_demo_mode')
  }
}