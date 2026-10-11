# Mudlay — client-ready store starter

This package now contains a **React Native / Expo customer app** plus an Express/MongoDB API and the existing React web admin panel. It is designed to be configured for a real clothing shop, not to display a fake demo catalogue.

## What's included

- Native mobile storefront with categories, product search, favourites, bag/cart, account screen and order history.
- Customer registration/login with bcrypt password hashing and JWT sessions.
- MongoDB-persisted favourites and cart for signed-in customers; guest cart/favourites are stored locally and merged on sign-in.
- Order request records in MongoDB and stock checks/decrements when an order is placed. This starter records an order request; it does **not** collect online payment.
- Customer profile updates and admin API endpoints for listing orders and updating order status.
- Existing React/Vite admin portal for managing catalogue products and images.

## Project layout

- `mobile/` — Expo React Native app
- `server/` — Express API, MongoDB models, customer auth/state/orders and admin/product routes
- `client/` — existing React/Vite admin/store web client

## 1. Configure the API

Install Node.js 20.19+ (Node 22 LTS is also suitable). In `server/`, copy `.env.example` to `.env` and set:

- `MONGODB_URI` to your MongoDB Atlas connection string
- `JWT_SECRET` to a long random secret (at least 32 random characters)
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` to private admin credentials
- `CLIENT_ORIGIN` to your deployed web admin origin(s), comma-separated if needed

Do not commit `.env` to Git or send secrets in chat. Confirm MongoDB Atlas Network Access allows the backend host, and use a database user with only the required database permissions.

```bash
cd server
npm install
npm run dev
```

Check `http://localhost:5000/api/health`. It should return `{ "ok": true, "service": "Mudlay API" }`.

## 2. Run the mobile app

In a second terminal:

```bash
cd mobile
copy .env.example .env
npm install
npx expo start
```

Edit `mobile/.env` and set `EXPO_PUBLIC_API_URL`:

- Android emulator: `http://10.0.2.2:5000/api`
- Physical Android/iPhone on the same Wi-Fi: `http://YOUR_COMPUTER_LAN_IP:5000/api`
- Live app: `https://YOUR_DEPLOYED_API_DOMAIN/api`

For a physical phone, your laptop and phone must be on the same network and your firewall must allow the API port. For production, use HTTPS; do not ship a private LAN IP.

Install Expo Go on your test phone and scan the QR code. For a distributable Android app, configure EAS Build using the official Expo workflow. Package ID is currently `in.odikart.mudlay`; confirm the client owns/approves that ID before publishing.

## 3. Run the existing web admin

In another terminal:

```bash
cd client
copy .env.example .env
npm install
npm run dev
```

Set `VITE_API_URL` to the backend API URL. Visit the local URL shown by Vite and open `/admin` for the admin panel. Admin credentials come from `server/.env`.

Admin order API endpoints are available at:

- `GET /api/orders` — list orders (admin JWT required)
- `PATCH /api/orders/:id/status` — set `placed`, `confirmed`, `packed`, `shipped`, `delivered`, or `cancelled` (admin JWT required)

The existing web admin UI may need an Orders screen wired to these endpoints if the shop owner needs to manage orders without API tooling.

## 4. Before a real client launch

1. Replace the shop name, logo, product photos, prices, sizes, stock, phone/WhatsApp, address, policies and social links with client-approved information. Add real products through the admin panel; the mobile app intentionally does not invent sample products if the API is offline.
2. Deploy the API to a stable host and MongoDB Atlas with backups, HTTPS, environment secrets, request rate limits, monitoring and an appropriate access policy.
3. Move uploaded product images from local disk to durable object storage/CDN before production; ephemeral host disks may erase uploads on redeploy.
4. Configure production API URL and WhatsApp number in `mobile/.env` before building the app.
5. Add an order management UI, shipping/tax rules, privacy policy, terms, return/refund policy, and customer support contact.
6. If taking online payments, integrate and verify a payment gateway server-side (e.g. Razorpay) and validate payment webhooks before marking orders paid. This code does not process online payments.
7. Test on real devices, test authentication and stock conflicts, and have the shop owner approve all details before publishing.
8. Create the client's Expo/EAS and Play Console accounts, signing credentials and store listing under the client's ownership.

## Important: “live” vs “launch-ready”

The code is prepared for a real catalogue and database persistence, but it is **not automatically deployed or published** by creating this ZIP. A live launch needs the client's real business details, hosting/API URL, secure environment variables, product catalogue, image storage and publishing account. Hosting tiers and app-store publishing may have costs; no provider is guaranteed to remain free forever. Do not present the store as live until the deployed API, products, policies and customer order flow have been tested.


## UX improvements
- AOS (Animate On Scroll) animations on the storefront and product cards, with reduced-motion preference support.
- Responsive mobile bottom navigation for Shop, Saved favourites, and Bag.
- Cart quantities and favourite product IDs persist in browser localStorage across refreshes on the same browser/device. Product data is refreshed from the API when available.
- The Expo mobile app already uses AsyncStorage for guest cart/favourites and syncs signed-in customers' cart/favourites to MongoDB through `/api/customer/me/state`.

Note: browser localStorage is device/browser-specific. To sync web favourites and cart across devices, add customer sign-in to the web frontend and use the existing customer API endpoints.
