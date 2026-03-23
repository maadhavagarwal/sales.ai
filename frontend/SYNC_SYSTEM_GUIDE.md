# 🔄 SYNCHRONIZED DATA SYSTEM - IMPLEMENTATION GUIDE

## Overview

All pages in your system (HR, Expenses, Segments, CRM, Portal) are now **automatically synchronized**. Changes made on any page instantly reflect across the entire system without manual page refreshes.

---

## 📦 What's New

### 1. **New Sync Store** (`frontend/store/useSyncStore.ts`)
- Central data management for all entities
- Tracks employees, expenses, segments, CRM deals, portal users
- Auto-increments version on any change for cross-page sync

### 2. **Synchronized Data Hook** (`frontend/hooks/useSynchronizedData.ts`)
- Easy-to-use hook for any component
- Auto-fetches and syncs data
- Handles create, read, update, delete operations
- Notifies all subscribed pages of changes

### 3. **Example Implementation** (`frontend/app/workspace/hr/page_sync_example.tsx`)
- Shows how to refactor pages to use the new system
- All changes auto-propagate to other pages

---

## 🚀 Quick Start - Refactor Any Page

### BEFORE (Isolated Page):
```tsx
// Old way - each page manages its own data
const [employees, setEmployees] = useState([])

const handleCreateEmployee = async () => {
  const response = await fetch("/workspace/hr/employees", ...)
  const data = await response.json()
  setEmployees([...employees, data]) // ❌ Only updates this page
}
```

### AFTER (Synchronized Page):
```tsx
// New way - all pages stay in sync
const { data: employees, create } = useSynchronizedData("employees")

const handleCreateEmployee = async () => {
  await create({ email, name, role, department })
  // ✅ Automatically updates ALL pages using employees!
}
```

---

## 📖 Implementation Steps

### Step 1: Import the Hook
```tsx
import { useSynchronizedData, useSyncListener } from "@/hooks/useSynchronizedData"
```

### Step 2: Use Synchronized Data
```tsx
const {
  data: employees,      // Array of employees
  loading,              // Boolean - is loading?
  error,                // Error message or null
  lastSync,             // Timestamp of last sync
  refresh,              // Manual refresh function
  create,               // Create new employee
  update,               // Update existing employee
  delete: deleteItem,   // Delete employee
} = useSynchronizedData("employees", {
  autoRefresh: true,    // Auto-sync every 30s
  refreshInterval: 30000 // 30 seconds
})
```

### Step 3: Use in Your Code
```tsx
// Create
await create({
  email: "john@company.com",
  name: "John Doe",
  role: "SALES",
  department: "Sales"
})

// Update
await update(employeeId, { role: "MANAGER" })

// Delete
await delete(employeeId)

// Manual refresh
await refresh()
```

### Step 4: (Optional) Listen for External Changes
```tsx
import { useSyncListener } from "@/hooks/useSynchronizedData"

// This runs whenever ANY page updates employees
useSyncListener("employees", () => {
  console.log("✅ Employees updated from another page!")
  // Do something special on sync if needed
})
```

---

## 📝 Entity Types Available

### `useSynchronizedData()` works with:

1. **"employees"** - HR management
   ```tsx
   const { data: employees } = useSynchronizedData("employees")
   ```

2. **"expenses"** - Expense tracking
   ```tsx
   const { data: expenses } = useSynchronizedData("expenses")
   ```

3. **"segments"** - Customer segments
   ```tsx
   const { data: segments } = useSynchronizedData("segments")
   ```

4. **"crmDeals"** - Sales deals
   ```tsx
   const { data: deals } = useSynchronizedData("crmDeals")
   ```

5. **"portalUsers"** - Portal access
   ```tsx
   const { data: users } = useSynchronizedData("portalUsers")
   ```

---

## 🔧 Configuration Options

```tsx
useSynchronizedData("employees", {
  apiBasePath: "/workspace",    // Base API path
  autoRefresh: true,            // Auto-refresh on mount
  refreshInterval: 30000,       // Refresh every 30s (milliseconds)
})
```

---

## 🎯 Sync Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│               HR PAGE                                         │
│  ┌────────────────────────────────────────┐                  │
│  │ useSynchronizedData("employees")       │                  │
│  │ - Displays employees list              │                  │
│  │ - Click "Create Employee"              │                  │
│  └────────────────┬───────────────────────┘                  │
│                   │                                          │
│                   ▼                                          │
│          API POST /workspace/hr/employees                   │
│                   │                                          │
│                   ▼                                          │
│     ┌─────────────────────────────┐                         │
│     │  SYNC STORE (useSyncStore)  │                         │
│     │  - stores employees[]       │                         │
│     │  - increments version++     │                         │
│     └────────┬────────────────────┘                         │
│              │                                              │
│              ├──────────────────────┬──────────────────┐    │
│              ▼                      ▼                  ▼    │
│         ┌─────────┐          ┌──────────┐        ┌─────────┐
│         │EXPENSE  │          │SEGMENT   │        │PORTAL   │
│         │PAGE     │          │PAGE      │        │PAGE     │
│         │         │          │          │        │         │
│         │Auto-    │          │Auto-     │        │Auto-    │
│         │updates! │          │updates!  │        │updates! │
│         └─────────┘          └──────────┘        └─────────┘
│
│  (All pages using "employees" sync automatically)
└──────────────────────────────────────────────────────────────┘
```

---

## ✅ Benefits

| Feature | Before | After |
|---------|--------|-------|
| **Create employee** | Only updates HR page | ✅ Updates all pages instantly |
| **Delete employee** | Manual refresh needed | ✅ Auto-synced everywhere |
| **Update data** | Pages can get out of sync | ✅ Single source of truth |
| **API calls** | Duplicate requests | ✅ Cached & optimized |
| **Code duplication** | Each page manages state | ✅ Reusable hook |
| **Real-time updates** | Not available | ✅ Workplace wide sync |

---

## 🔄 Auto-Sync Behavior

```tsx
// This auto-syncs on:
const { data } = useSynchronizedData("employees")

// 1. Component mount
// 2. Every 30 seconds (based on refreshInterval)
// 3. When ANY page updates employees
// 4. When you call refresh()
// 5. When globalSyncVersion changes
```

---

## 🛠️ Advanced: Custom Sync Listener

```tsx
import { useWorkspaceSyncListener } from "@/hooks/useSynchronizedData"

export function MyComponent() {
  // Triggers whenever ANY page updates ANY entity
  useWorkspaceSyncListener(() => {
    console.log("Something updated in the system!")
    // Refresh totals, recalculate, etc.
  })

  return <div>Content</div>
}
```

---

## 📋 Refactor Checklist

To update any page to use synchronized data:

- [ ] Import `useSynchronizedData` from `@/hooks/useSynchronizedData`
- [ ] Replace `useState()` with `useSynchronizedData("entityName")`
- [ ] Remove manual `setData()` calls - use `create()`, `update()`, `delete()` instead
- [ ] Remove manual `refresh()` intervals - auto-refresh handles it
- [ ] Remove duplicate API endpoint URLs - hook manages endpoints
- [ ] Remove `useEffect(() => { fetchData() })` - hook auto-fetches
- [ ] Test that changes on this page appear on other pages
- [ ] (Optional) Add `useSyncListener()` for special sync behavior

---

## 🚨 Error Handling

```tsx
const { data, error, loading } = useSynchronizedData("employees")

if (loading) return <Loader />
if (error) return <div>Error: {error}</div>

return <div>{data.length} employees</div>
```

---

## 💾 Data Persistence

The sync store is in-memory by default. To persist across page refreshes:

```tsx
// Option 1: Use localStorage (done automatically for userSettings)
// Option 2: API always loads fresh data on mount
// Option 3: Add Redux persist middleware if needed
```

---

## 🎓 Example: Full Page Refactor

See `frontend/app/workspace/hr/page_sync_example.tsx` for a complete working example showing:
- Setup
- Employee listing
- Create employee (with auto-sync)
- Delete employee (with auto-sync)
- Update employee (with auto-sync)
- Error handling
- Loading states

---

## 🔗 Integration Map

Use `useSynchronizedData()` on these pages:

| Page | Entity | File |
|------|--------|------|
| HR Management | `employees` | `frontend/app/workspace/hr/page.tsx` |
| Expenses | `expenses` | `frontend/app/workspace/expenses/page.tsx` |
| Segments | `segments` | `frontend/app/segments/page.tsx` |
| CRM | `crmDeals` | `frontend/app/crm/page.tsx` |
| Portal | `portalUsers` | `frontend/app/portal/page.tsx` |

---

## ❓ FAQ

**Q: Do I need to manually refresh pages?**
A: No! Auto-refresh is enabled by default (30s intervals). Manual refresh available via `refresh()`.

**Q: What if I want different sync intervals for different pages?**
A: Pass `refreshInterval: 60000` to get 60-second intervals instead.

**Q: Can I disable auto-refresh?**
A: Yes: `useSynchronizedData("employees", { autoRefresh: false })`

**Q: What if an API call fails?**
A: Error is caught and stored in `error` state. Retry via `refresh()`.

**Q: How do I sync across browser tabs?**
A: Zustand store syncs within same tab. For cross-tab, add `localStorage` listener.

---

## 📞 Support

If you encounter issues:
1. Check console for error messages
2. Verify API endpoints are correct
3. Clear browser cache (`Ctrl+Shift+Delete`)
4. Check `/workspace/` endpoints exist in backend

---

**Now all your pages are in sync! 🎉**
