# Memory: index.md
Updated: now

# Project Memory

## Core
- Strict identity separation: admins, users, and artists must maintain separate accounts. No sharing.
- Event capacity constraint: Max 3 concurrent event bookings per date enforced globally.
- Razorpay modals MUST be rendered outside focus-trapping dialogs to prevent iframe issues.
- Admin Design constraint: Apple-inspired 3D soft UI (neumorphism/glassmorphism), warm ivory & neutral palette.
- Data retention: Admin UI deletions are non-destructive and permanently backed up in Google Sheets 'Mini Database'.
- Data privacy constraint: 'x-guest-session-id' header required for AI chat; path-based RLS for documents.
- Reactivity: 30s staleTime for global settings, 'useAutoUpdate' hook polls for builds every 45s.
- Theme: FinRank-inspired — off-white #f5f5ec base, lime green primary (HSL 82 78% 55%), near-black ink (HSL 220 13% 9%). Warm gold (HSL 35 50% 60%) reserved for logo touchpoints only.
- Use semantic tokens only: btn-pill-ink (black CTA), btn-pill-lime (green raised CTA), card-lime-float, card-ink-float, card-snow-float, chip-lime-ring.

## Memories
- [Caricature Dynamic Rates](mem://business-rules/pricing/caricature-dynamic-rates) — Supabase Realtime pricing for caricatures with manual override
- [Event Regional Rates](mem://business-rules/pricing/event-regional-rates) — Mumbai starts at ₹30k, Pan-India ₹40k, 2.6% fee on advance
- [International Hierarchy](mem://business-rules/pricing/international-hierarchy) — 4-tier pricing structure for international events
- [Payment Fulfillment Logic](mem://finance/payment-fulfillment-logic) — Multi-stage partial payments to 'fully_paid' with idempotent edge functions
- [Payment Demands](mem://finance/payment-demands) — Custom demands triggering status transitions with strict RLS
- [Admin Accounting System](mem://finance/admin-accounting-system) — P&L/Balance Sheets, 2.6% gateway fee logic, FY rules
- [Lead Links System](mem://finance/lead-links-system) — One-time use URLs for dynamic pricing overrides
- [Artist Payout Management](mem://finance/artist-payout-management) — Percentage/fixed payout logic, artist-managed banking, admin approvals
- [Event Capacity Management](mem://features/event/capacity-management) — Strict 3-event per date limit with 3D calendar override
- [Event Management Logistics](mem://features/event/management-and-logistics) — Flight ticket uploads outside Maharashtra, signed URL travel docs
- [Partial Advance Flow](mem://features/event/partial-advance-flow) — 2-stage split advance payment with red/green UI status themes
- [Artist Portal & Dashboard](mem://features/artist/portal-and-dashboard) — Mobile-first portal, unclosable payment overlay prompt
- [Artist Matching Engine](mem://features/artist/matching-and-assignment) — Rating/distance based matching and Auto-Assign capability
- [AI Caricature Generator](mem://features/caricature/ai-generator-and-pod) — Gemini POD workflow with merchandise previews
- [Caricature Order Tracking](mem://features/caricature/order-tracking) — Dual-tab tracking with 'Caricature Paused' state logic
- [Shop Ecommerce System](mem://features/shop/ecommerce-system) — POD & regular products with variant pricing and pincode check
- [Lil Flea Experience](mem://features/content/lil-flea-experience) — Landing page with cinematic splash and 3D cards
- [Admin UI Controls](mem://features/admin/ui-control-and-forms) — Global toggles for caricature orders, auth popups, splash screens
- [Admin Visual Design System](mem://features/admin/visual-design-system) — 3D soft UI, warm ivory/neutral, pastel accents
- [Admin Analytics Intelligence](mem://features/admin/analytics-and-intelligence) — Web analytics widgets and IP/location security blocking
- [Admin Team Colleagues](mem://features/admin/team-and-colleagues) — 5 main admins, masked PII, 3-step destructive confirmation
- [Data Privacy RLS](mem://security/data-privacy-and-rls) — Restricted PII access, scoped headers for AI chat, path-based storage policies
- [Admin Access Control](mem://security/admin-access-control) — Optional geolocation requirement for admin login with overlay block
- [Role Identity Separation](mem://security/role-identity-separation) — Strict separation between admin/user/artist with 'Name Gate' verification
- [Admin Mobile Navigation](mem://style/admin-mobile-navigation) — CSS-only bottom sheet and horizontal track for 40+ modules
- [Application Sync Architecture](mem://tech/application-architecture-and-sync) — 30s cache TTL, GPU CSS, 45s build poll, content-visibility
- [Workshop System Architecture](mem://features/workshop/system-architecture) — Glassmorphism student dashboard, secret code auth, legacy bypass
- [Caricature Pricing Calculator](mem://features/caricature/pricing-calculator) — 10s animated discovery, urgency timers, guest-count logic
- [AI Chatbot Assistant](mem://features/content/ai-chatbot) — Gemini Flash assistant requiring Name/Email/City before pricing
- [Admin Revenue Target Engine](mem://features/admin/revenue-target-engine) — Gamified ₹10L monthly tracking and performance visualization
- [CRM Automation Engine](mem://features/admin/crm-automation-engine) — Kanban pipeline with device fingerprinting and WhatsApp automations
- [App Onboarding Flow](mem://features/content/app-onboarding) — 3-slide sequence bypassing on OAuth redirects
- [Live Chat System](mem://features/content/live-chat-system) — Admin-editable Quick Questions and user-detail sidebar context
- [Admin Calendar Scheduling](mem://features/admin/calendar-and-scheduling) — 3D hub unifying events, deliveries, and blocked dates
- [Database Recovery Console](mem://features/admin/database-recovery-console) — Dark terminal interface with 8-digit secret and 3-step deletion
- [Google Sheets Backup](mem://integrations/google-sheets-backup-sync) — Mirror 'Mini Database' ensuring non-destructive logging
- [Brand Typography Motion](mem://style/brand-typography-and-motion) — Great Vibes font, ScrollTypeReveal, parallax effects
- [Razorpay Robustness](mem://integrations/razorpay-robustness) — Safe-loader, outside-dialog modals, mandatory contact payload
- [Splash Intro Experience](mem://features/admin/splash-intro-experience) — 15s fullscreen animated login splash screen
- [Enquiry Funnel Quotes](mem://features/content/enquiry-funnel-and-quotes) — Pre-filled WhatsApp lead capture with 50% advance calc
