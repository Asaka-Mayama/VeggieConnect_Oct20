<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/890faf01-a79f-4a14-9221-3b8228c72ba6

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Setup notes (admin password, MySQL, demo reset)

1. Copy `.env.example` to `.env` and set **`ADMIN_PASSWORD`** (admin login is disabled until you do).
2. Start XAMPP's MySQL and import `veggie_connect2.sql`. Orders, transport jobs and chat messages are
   saved to MySQL (tables `orders`, `transport_jobs`, `direct_messages`) and survive server restarts.
   The server adds any missing columns automatically.
3. Install with `npm install --legacy-peer-deps`, then run `npm run dev`.
4. `VITE_ENABLE_DEMO_RESET` must stay `"false"` for the real demo. Only set it to `"true"` when you
   deliberately want the Reset Demo Data button / `/api/reset-all` to wipe everything.

### Roles
There are three roles: **buyer**, **farmer** and **admin**. The admin also handles all deliveries
(there is no separate transporter / rider account). Only buyers and farmers can sign up.
