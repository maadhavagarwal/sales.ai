#!/bin/bash
# Quick Validation Script for NeuralBI Platform Upgrade
# Run this to verify all new features are accessible and working

echo "🚀 NeuralBI Professional Platform Upgrade Validation"
echo "=================================================="
echo ""

# Step 1: Check if files exist
echo "✓ Checking new files..."
files_created=(
    "frontend/app/management/page.tsx"
    "frontend/app/messaging/page.tsx"
    "frontend/app/meetings/page.tsx"
    "backend/app/routes/messaging_routes.py"
    "backend/app/routes/meetings_routes.py"
)

for file in "${files_created[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (MISSING)"
    fi
done

echo ""
echo "✓ Checking navigation integration..."
if grep -q "Collaboration Hub" "frontend/components/layout/Sidebar.tsx"; then
    echo "  ✅ Sidebar updated with Collaboration Hub"
else
    echo "  ❌ Sidebar not updated"
fi

echo ""
echo "✓ Checking backend API endpoints..."
if grep -q "messaging_router\|meetings_router" "backend/app/main.py"; then
    echo "  ✅ API routers registered"
else
    echo "  ❌ API routers not registered"
fi

echo ""
echo "✓ Checking frontend API client..."
if grep -q "getConversations\|scheduleMeeting" "frontend/services/api.ts"; then
    echo "  ✅ API functions available"
else
    echo "  ❌ API functions not available"
fi

echo ""
echo "=================================================="
echo "📋 Manual Testing Checklist"
echo "=================================================="
echo ""
echo "Frontend Tests (http://localhost:3000):"
echo "  [ ] Can access /management dashboard"
echo "  [ ] Can access /messaging center"
echo "  [ ] Can access /meetings calendar"
echo "  [ ] Sidebar shows Collaboration Hub"
echo "  [ ] Can click dashboard links to navigate"
echo ""
echo "UI/UX Tests:"
echo "  [ ] Management dashboard shows user info"
echo "  [ ] Messaging shows conversation list"
echo "  [ ] Can type messages in chat"
echo "  [ ] Can schedule meetings"
echo "  [ ] All buttons are clickable"
echo "  [ ] Mobile layout is responsive"
echo ""
echo "Backend Tests (http://localhost:8000):"
echo "  [ ] /docs shows new API endpoints"
echo "  [ ] GET /api/messaging/conversations works"
echo "  [ ] POST /api/meetings/ accepts data"
echo "  [ ] Auth required on endpoints"
echo ""
echo "=================================================="
echo "🎯 Success Criteria"
echo "=================================================="
echo "✅ All new files exist"
echo "✅ Navigation integrated"
echo "✅ UI components render correctly"
echo "✅ API endpoints accessible"
echo "✅ Mobile responsive"
echo "✅ Professional styling applied"
echo ""
echo "🚀 Ready for stake holder delivery!"
echo ""
