

# Creative Caricature Club — Custom Caricature Order Website

## Overview
A fully automated caricature ordering website with a customer-facing multi-step order form and a team admin dashboard. Customers choose between Digital or Physical caricatures, fill out a dynamic form, pay via Razorpay, and receive confirmation. Admins manage orders, view uploaded images, update statuses, and see analytics.

---

## 1. Landing Page
- Hero section with brand identity and a prominent **"Order Your Custom Caricature"** CTA button
- Info banner about current delivery timelines
- Brief showcase of caricature styles (Cute, Romantic, Fun, Royal, Minimal)
- Clean, premium, mobile-friendly design

---

## 2. Multi-Step Order Form

### Step 1: Choose Type
- **Digital Caricature** or **Physical (Hand-drawn) Caricature**
- Selection dynamically controls all subsequent steps

### Digital Flow (Steps 2–4):
- **Step 2** — Customer details (Name, Mobile, Email) + Order type (Single ₹3,000 / Couple ₹9,000 / Group ₹3,000 per face) + Style/Theme dropdown + optional notes
- **Step 3** — Photo upload (multiple HD images, drag & drop)
- **Step 4** — Order summary with auto-calculated price → Razorpay payment
- Delivery info shown: "15–20 days, digital file (JPEG/PNG)"
- No address fields

### Physical Flow (Steps 2–7):
- **Step 2** — Location (Country, State, City, District) with auto-frame logic (Mumbai = framed, elsewhere = no frame with explanation message)
- **Step 3** — Customer details (Name, Mobile, Email)
- **Step 4** — Order type (Single ₹5,000 / Couple ₹9,000 / Group ₹3,000 per face) + Style/Theme + optional notes
- **Step 5** — Photo upload (multiple HD images, drag & drop)
- **Step 6** — Delivery address (Full Address, City, State, Pincode)
- **Step 7** — Order summary with delivery timeline (20–25 days) → Razorpay payment

### Post-Payment
- Order confirmation page
- Email confirmation sent to customer
- Order created in system only after successful payment verification

---

## 3. Backend (Supabase + Lovable Cloud)
- **Auth** — Email/password authentication for admin team members
- **Database tables** — Orders, customer details, order items, user roles (admin/moderator)
- **Storage** — Secure image storage bucket for uploaded photos, linked to order IDs
- **Edge functions** — Razorpay payment verification (server-side), order confirmation emails
- **Role-based access** — Separate user_roles table with RLS policies for admin panel security

---

## 4. Admin Dashboard

### Orders Dashboard
- Filterable/sortable table of all orders showing: Order ID, Type (Digital/Physical), Customer Name, City, Order Type, Amount, Frame (Yes/No), Status
- Search and filter by status, type, date

### Individual Order View
- Full customer details, uploaded images (view & download), selected style & notes, delivery address (physical only), payment confirmation

### Order Status Management
- Status workflow: New Order → In Progress → Artwork Ready → Dispatched (Physical only) → Delivered/Completed
- Update status with one click

### Team Access
- Multiple admin/moderator logins with role-based permissions

### Analytics
- Digital vs Physical order counts
- Total revenue and pending orders
- Location-wise breakdown

---

## 5. Key Automations
- Pricing auto-calculated based on type and face count
- Frame inclusion auto-determined by city (Mumbai = yes)
- Address fields shown only for Physical orders
- Delivery timeline auto-displayed based on order type
- Orders created only after server-side payment verification
- No duplicate order submissions

