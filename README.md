# Online Food Ordering System

A beginner-friendly full-stack food ordering website. Customers can browse a menu, search and filter dishes, maintain a cart, place orders, and see order status. Administrators can add food items and update order statuses.

## Features
- Responsive menu with search and category filters.
- Customer registration and login with bcrypt password hashing and expiring JWTs.
- Shopping cart and server-calculated order totals.
- Persistent orders and order history in Supabase PostgreSQL.
- Admin-only menu creation and order-status updates.
- Express input validation, rate limiting, Helmet security headers, and protected admin routes.
- Demo menu seeded by SQL. No online payment gateway is included.

## Technology
HTML5, CSS3, Vanilla JavaScript, Node.js, Express.js, Supabase PostgreSQL, Git and GitHub.

## Folder structure
```text
food-ordering-application/
├── frontend/ (index.html, styles.css, app.js)
├── backend/ (server.js, supabase.js, routes/, middleware/, utils/, package.json, .env.example, .gitignore)
├── database/ (schema.sql)
├── .gitignore
└── README.md
```

## Prerequisites
Install [Node.js LTS](https://nodejs.org/), [Git](https://git-scm.com/downloads), [Visual Studio Code](https://code.visualstudio.com/), and create a free Supabase project at [Supabase](https://supabase.com/).

## Setup on Windows
1. Download and install Node.js LTS, Git, and VS Code. Open VS Code and choose **File → Open Folder**; open `food-ordering-application`.
2. In VS Code, choose **Terminal → New Terminal**. Check the tools:
   ```powershell
   node --version
   npm --version
   git --version
   ```
   Each command should print a version number.
3. Create a Supabase project. In its dashboard, open **SQL Editor → New query**, paste all of `database/schema.sql`, and click **Run**. Check **Table Editor** for `profiles`, `categories`, `food_items`, `orders`, and `order_items`. The SQL inserts a small demo menu.
4. Open Supabase **Project Settings → API** (or the project's API keys page). Copy the project URL and the server-side secret/service-role key. Keep the key private. Never put it in `frontend/` or commit it.
5. In the terminal, change to the backend folder:
   ```powershell
   cd backend
   npm install
   Copy-Item .env.example .env
   ```
   Open `backend/.env` and replace the example values:
   - `PORT=3000`: local server port.
   - `NODE_ENV=development`: local development mode.
   - `SUPABASE_URL`: your Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: your server-only Supabase secret/service-role key.
   - `JWT_SECRET`: a random secret of at least 32 characters. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` from the backend folder.
   - `JWT_EXPIRES_IN=2h`: login token lifetime.

   `.env` contains your private local values and is ignored by Git. `.env.example` contains safe placeholders and should be committed.
6. Run a syntax check and start the server from `backend/`:
   ```powershell
   npm run check
   npm start
   ```
   Expected terminal message: `Food Ordering Application running at http://localhost:3000`.
7. Open `http://localhost:3000` in your browser. Do not open `index.html` directly as a file; use the server URL so `/api` calls work.
8. Create a customer account with **Sign up**, log in, add dishes to the cart, and place an order. Orders require an address and phone number. The **My orders** section displays order history.

## Create an administrator
For safety, public registration always creates a `customer` role. First register a normal account through the site. In Supabase **SQL Editor**, run the following query after replacing the email with that exact account email:

```sql
update public.profiles set role = 'admin' where email = 'your-admin-email@example.com';
```

Log out and log in again so the new role is included in the token. The Admin button should appear. Never let users choose their role in the public registration form.

## Architecture
The browser calls Express endpoints with `fetch()`. Express validates requests and uses the server-only Supabase client to access PostgreSQL. JWTs identify the logged-in account; admin endpoints check the role on the server. RLS is enabled on all application tables and no direct browser policies are added because all table access in this implementation goes through Express. The Supabase service key bypasses RLS, so server-side authorization is essential; keep it secret.

## API reference
All responses are JSON. Protected routes require `Authorization: Bearer <token>`.

| Method | Path | Purpose / access |
|---|---|---|
| GET | `/api/health` | Server health check; public |
| POST | `/api/auth/register` | Create customer account; public |
| POST | `/api/auth/login` | Log in; public, rate limited |
| GET | `/api/auth/me` | Current token identity; logged-in user |
| GET | `/api/foods` | Available menu; optional `search` and `category` query parameters; public |
| GET | `/api/foods/categories` | List categories; public |
| POST | `/api/orders` | Place order; customer or admin token; body: `items: [{food_id, quantity}]`, `delivery_address`, `phone` |
| GET | `/api/orders/mine` | Current user's order history; logged-in user |
| GET | `/api/admin/orders` | List all orders; admin only |
| PATCH | `/api/admin/orders/:id/status` | Change status; admin only; body: `{ "status": "Preparing" }` |
| POST | `/api/admin/foods` | Add a menu item; admin only; body includes `name`, `price`, optional `description`, `category_id` |
| PATCH | `/api/admin/foods/:id` | Edit menu item; admin only |
| DELETE | `/api/admin/foods/:id` | Delete menu item; admin only |

Typical errors: `400` invalid input, `401` missing/invalid/expired login, `403` insufficient role, `404` unknown route or record, `409` duplicate email, `500` unexpected server/configuration issue. Server logs contain diagnostic error messages; client responses intentionally do not expose database details.

## Manual test checklist
1. Visit `/api/health`; expect `{ "status": "ok", ... }`.
2. Browse menu; seeded demo foods should appear.
3. Search a dish and change category; results should update.
4. Register a new account; duplicate email should show an error.
5. Log in with a wrong password; access should be denied.
6. Add multiple items and adjust quantities; cart total should change.
7. Attempt checkout while logged out; the app should ask you to log in.
8. Place an order; expect an order confirmation and a record in Supabase `orders` plus related `order_items`.
9. Refresh the page and log in again; order history should remain.
10. Try `/api/admin/orders` without a token; expect `401`. Try with a customer token; expect `403`.
11. Promote a test account to admin using the SQL above, log in again, and update an order status.
12. Test empty fields, malformed email, too-long inputs, invalid quantities, narrow mobile widths, and unavailable foods.

## Troubleshooting
- **Supabase connection/configuration error:** check `backend/.env`, URL spelling, key type, and restart the server after changing the file.
- **Menu not loading:** run `database/schema.sql` and confirm the tables and demo rows exist.
- **Invalid JWT secret:** use a random secret of at least 32 characters.
- **401 after waiting:** tokens expire; log in again.
- **Admin button missing:** promote the account in Supabase, log out, and log in again.
- **Port in use:** change `PORT` in `.env`, then visit that port in the browser.
- **Browser cannot reach API:** use `http://localhost:3000`, not `file:///.../index.html`.

## Git and GitHub
From the **root project folder** (open a second terminal or `cd ..` from `backend/`):
```bash
git init
git status
git add .
git status
git commit -m "Build food ordering application"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```
Create an empty repository on GitHub first and replace `YOUR_GITHUB_REPOSITORY_URL` with its actual URL. Before `git add .`, confirm `backend/.env`, `node_modules/`, credentials, private customer data, and database exports are not staged. `.env.example` should be included. `.gitignore` does not erase a secret already committed. If a credential is exposed, rotate it immediately and clean the repository history as needed.

## Limitations and future improvements
- No online payment integration, delivery-driver portal, email/SMS alerts, or live GPS tracking.
- JWT is stored in browser localStorage for beginner-friendly demonstration; this increases impact of an XSS bug. For production, prefer secure, HttpOnly cookies with appropriate CSRF protection or a carefully designed auth provider.
- For a real commercial service, review order pricing/availability and authorization inside the database transaction, add automated tests, monitoring, backups, and deployment-specific CORS settings. The SQL RPC is atomic for inserting an order and its items, but current item prices are checked by the backend immediately before the RPC.

## Project verification
Run `npm run check` in `backend/` to check JavaScript syntax. Then follow the manual test checklist with your own Supabase project. A remote database connection cannot be verified until you add your own project credentials and run the SQL schema.
