# 🎨 Modern UI Component Guide - Quick Reference

## Component Imports

```typescript
// From the new component library
import { 
  Button, 
  Card, 
  Container, 
  Badge, 
  Input, 
  Select,
  Grid,
  Flex,
  Modal,
  LoadingSpinner,
  Breadcrumb,
  ResponsiveTable,
  Toast,
  CurrencySelector
} from "@/components/ui"

// From layout components
import { Sidebar } from "@/components/layout/Sidebar"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout"
```

---

## Component API Documentation

### Button Component

```typescript
<Button
  variant="primary"      // primary | secondary | outline | ghost | danger
  size="md"             // sm | md | lg | xl
  fullWidth={false}     // Make button full width
  loading={false}       // Show loading spinner
  icon={<Icon />}       // Add icon
  iconPosition="left"   // left | right
  disabled={false}      // Disable button
  onClick={handleClick}
>
  Button Text
</Button>
```

**Variants:**
- `primary` - Blue gradient (main action)
- `secondary` - Gray background (secondary action)
- `outline` - Border only
- `ghost` - Transparent background
- `danger` - Red background (destructive action)

### Card Component

```typescript
<Card
  variant="default"      // default | elevated | outlined
  padding="md"          // sm | md | lg
  interactive={false}   // Add hover effects
>
  Card content here
</Card>
```

### Input Component

```typescript
<Input
  label="Email"
  type="email"
  placeholder="your@email.com"
  value={state}
  onChange={(e) => setState(e.target.value)}
  error="Error message"
  helperText="Helper text"
  fullWidth={true}
  disabled={false}
/>
```

### Select Component

```typescript
<Select
  label="Choose option"
  options={[
    { label: "Option 1", value: "opt1" },
    { label: "Option 2", value: "opt2" }
  ]}
  value={state}
  onChange={(e) => setState(e.target.value)}
  error="Error message"
  fullWidth={true}
/>
```

### Badge Component

```typescript
<Badge
  variant="primary"    // primary | success | warning | danger | info
  size="md"           // sm | md | lg
>
  Badge Text
</Badge>
```

### Grid Component

```typescript
<Grid
  cols={{ sm: 1, md: 2, lg: 3, xl: 4 }}  // Columns per breakpoint
  gap="lg"                                  // xs | sm | md | lg | xl
>
  {/* Grid items */}
</Grid>
```

### Flex Component

```typescript
<Flex
  direction="row"      // row | col
  align="center"       // start | center | end | stretch
  justify="between"    // start | center | end | between | around | evenly
  gap="md"            // xs | sm | md | lg | xl
  wrap={false}        // Allow wrapping
>
  {/* Flex items */}
</Flex>
```

### Modal Component

```typescript
const [isOpen, setIsOpen] = useState(false)

<Modal
  isOpen={isOpen}
  title="Modal Title"
  onClose={() => setIsOpen(false)}
  size="md"           // sm | md | lg
>
  Modal content
</Modal>
```

### Container Component

```typescript
<Container
  size="lg"          // sm | md | lg | xl | full
  centered={true}    // Center content
>
  Content with max-width and padding
</Container>
```

### LoadingSpinner Component

```typescript
// Inline spinner
<LoadingSpinner size="md" />  // sm | md | lg

// Full screen spinner
<LoadingSpinner size="lg" fullScreen />
```

### ResponsiveTable Component

```typescript
<ResponsiveTable
  headers={["Name", "Email", "Status"]}
  rows={[
    ["John Doe", "john@example.com", "Active"],
    ["Jane Smith", "jane@example.com", "Inactive"],
  ]}
/>
```

### Breadcrumb Component

```typescript
<Breadcrumb
  items={[
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings" }  // Current page (no href)
  ]}
/>
```

---

## Layout Patterns

### Dashboard Layout

```typescript
import { DashboardLayout } from "@/components/layout/DashboardLayout"

export default function DashboardPage() {
  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Welcome back"
      actions={<SomeActions />}
    >
      {/* Page content */}
    </DashboardLayout>
  )
}
```

### With Sidebar + Header

```typescript
<div className="flex min-h-screen bg-slate-950">
  <Sidebar />
  <main className="flex-1 flex flex-col">
    <PageHeader title="Page Title" subtitle="Subtitle" />
    <div className="flex-1 overflow-y-auto px-6 py-8">
      {/* Content */}
    </div>
  </main>
</div>
```

### Responsive Container

```typescript
<Container size="lg">
  <Grid cols={{ sm: 1, md: 2, lg: 3 }} gap="lg">
    {/* Grid items */}
  </Grid>
</Container>
```

---

## Responsive Tailwind Classes

### Breakpoints
```
sm  - 640px   (small phones)
md  - 768px   (tablets)
lg  - 1024px  (laptops)
xl  - 1280px  (desktops)
2xl - 1536px  (large screens)
```

### Common Patterns

```typescript
// Hide on mobile
<div className="hidden md:block">
  Visible only on tablets and up
</div>

// Responsive text size
<h1 className="text-2xl md:text-3xl lg:text-4xl">
  Responsive Heading
</h1>

// Responsive padding
<div className="p-4 md:p-6 lg:p-8">
  Responsive padding
</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  {/* Grid items */}
</div>

// Responsive flex
<div className="flex flex-col md:flex-row gap-4 md:gap-6">
  {/* Flex items */}
</div>

// Responsive display
<button className="w-full md:w-auto">
  Full width on mobile, auto on desktop
</button>
```

---

## Responsive Design Tips

### 1. Mobile First Approach
Always start with mobile styles, then add responsive classes for larger screens:

```typescript
// ❌ Wrong
<div className="p-8 md:p-4">Content</div>

// ✅ Right
<div className="p-4 md:p-8">Content</div>
```

### 2. Flexible Spacing
Use responsive spacing with sm: prefix for mobile:

```typescript
className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12"
```

### 3. Touch-Friendly
Ensure minimum tap target sizes (44px) on mobile:

```typescript
// Button automatically handles this
<Button size="md" />  // Results in ~48px height
```

### 4. Readable Text
Use reasonable text sizes with responsive scaling:

```typescript
className="text-sm sm:text-base md:text-lg"
```

### 5. Images & Media
Always use responsive images:

```typescript
<img 
  src="image.jpg" 
  alt="Description"
  className="w-full h-auto max-w-2xl"
/>
```

---

## Color Palette

### Primary
- `indigo-400` through `indigo-700` (main brand color)

### Accents
- `purple-600`, `cyan-600`, `emerald-600`, `amber-600`, `rose-600`

### Backgrounds
- `slate-950` (darkest)
- `slate-900`, `slate-800`, `slate-700` (working backgrounds)
- `slate-600`, `slate-500` (text colors)

### Text
- `slate-100` (primary text)
- `slate-300` (secondary text)
- `slate-400` (tertiary text)

---

## Accessibility

All components include:
- ✅ Semantic HTML
- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Focus states
- ✅ Color contrast compliance
- ✅ Screen reader support

### Tips:
```typescript
// Always add labels
<label htmlFor="input-id">Label</label>
<input id="input-id" />

// Use meaningful button text
<button aria-label="Close menu">✕</button>

// Add alt text
<img alt="Product image" src="..." />

// Use semantic HTML
<nav>, <main>, <section>, <article>, <header>, <footer>
```

---

## Performance

All components are:
- ✅ Un-opinionated about performance
- ✅ Lightweight (minimal CSS)
- ✅ Optimized for React 19 Server Components
- ✅ Tree-shakeable (import only what you need)

### Tips:
```typescript
// Good - specific component
import { Button } from "@/components/ui"

// Also good - barrel import
import { Button, Card, Input } from "@/components/ui"

// Don't do this in multiple files
import * from "@/components/ui"  // ❌ Not recommended
```

---

## Common Patterns

### Form with Validation
```typescript
const [email, setEmail] = useState("")
const [error, setError] = useState("")

const handleSubmit = (e) => {
  e.preventDefault()
  if (!email.includes("@")) {
    setError("Invalid email")
    return
  }
  // Submit form
}

<form onSubmit={handleSubmit}>
  <Input
    label="Email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    error={error}
    fullWidth
  />
  <Button variant="primary" fullWidth>
    Submit
  </Button>
</form>
```

### Modal Dialog
```typescript
const [isOpen, setIsOpen] = useState(false)

<>
  <Button onClick={() => setIsOpen(true)}>Open Dialog</Button>
  <Modal
    isOpen={isOpen}
    title="Confirm Action"
    onClose={() => setIsOpen(false)}
  >
    <p>Are you sure?</p>
    <div className="flex gap-4 mt-6">
      <Button variant="secondary" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="danger">Delete</Button>
    </div>
  </Modal>
</>
```

### Loading State
```typescript
const [loading, setLoading] = useState(false)

const handleClick = async () => {
  setLoading(true)
  try {
    await someAsyncAction()
  } finally {
    setLoading(false)
  }
}

<Button loading={loading} onClick={handleClick}>
  Click Me
</Button>
```

---

## Documentation & Support

For detailed component documentation, check:
- `UI_UPGRADE_SUMMARY.md` - Full upgrade guide
- Individual component files in `components/ui/`
- TypeScript types for auto-completion in your IDE

---

**Generated:** March 2026  
**Version:** 1.0  
**Framework:** Next.js 15 + React 19
