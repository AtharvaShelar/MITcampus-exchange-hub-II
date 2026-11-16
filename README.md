# 🎓 MIT Campus Exchange Hub — Full-Stack Web Application

An institute-exclusive marketplace, bidding, and exchange platform built for university students and faculty. The platform enables verified campus members to **buy, sell, rent, exchange, donate, message, rate partners**, and participate in **real-time product auctions / bidding** for high-demand academic items.

Developed for second-year B.Tech CSE Problem-Based Learning (PBL) evaluation.

---

## 🌟 Key Highlights & Full-Stack Capabilities

- **Institute Domain Verification**: Restricts user registration to verified institute email domains (e.g. `@demo.edu`, `@mit.edu`).
- **Role-Based Access Control (RBAC)**: Distinct permissions and experiences for **Students**, **Faculty/Staff**, and **Campus Administrators**.
- **🔨 Product Bidding & Auction System**:
  - Sellers choose between **Fixed Price** and **Bidding / Auction**.
  - Auction parameters: Starting bid price, minimum bid increment, and auction duration.
  - Live countdown ticker (days, hours, minutes, seconds) updating in real time.
  - Server-side atomic validation preventing race conditions.
  - Automatic auction finalization via background worker when deadlines expire.
  - Automated winner notification and transaction initiation.
- **Multiple Listing Types**: **Sale**, **Rent** (with custom rental periods), **Exchange** (specify wanted item), and **Donation** (free items).
- **Conflict-Free Purchase Requests**: When a seller accepts a buyer's request, the listing is automatically reserved and conflicting pending requests are safely cancelled.
- **Persistent Peer-to-Peer Chat**: In-app messaging between buyers and sellers with access-control guards.
- **Verified Rating & Review System**: Reviews can only be submitted for completed transactions, preventing spam and fraudulent reviews.
- **Admin Moderation Dashboard**: Platform metrics, user role management, account suspension/reactivation, report reviews, and activity auditing.
- **Dual-Mode Data Access Layer**: Runs on MongoDB (Local or Atlas) via Mongoose. If MongoDB is not running locally, it gracefully activates an embedded zero-config persistent JSON storage engine (`server/data/db.json`), ensuring the app runs out-of-the-box anywhere.

---

## 🏗️ Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, Semantic CSS3 (custom design system, responsive flexbox/grid, modal dialogs, real-time auction ticker).
- **Backend**: Node.js & Express.js REST API with MVC pattern.
- **Database**: MongoDB with Mongoose Schemas & Validation + Embedded persistent JSON fallback.
- **Security**: JWT (JSON Web Tokens), `bcryptjs` password hashing (10 salt rounds), rate limiting (`express-rate-limit`), input sanitization.
- **File Uploads**: `multer` with file size limits (5 MB) and MIME-type verification.

---

## 📁 Project Directory Structure

```text
mit-exchange-hub/
├── .env.example              # Environment variables template
├── .env                      # Local environment configuration
├── package.json              # Project dependencies and npm scripts
├── README.md                 # Complete documentation & defense guide
├── public/                   # Frontend assets
│   ├── index.html            # Main Single-Page Application HTML
│   ├── style.css             # Design system, cards, auction tickers & layouts
│   ├── script.js             # Client controller, API client & live countdowns
│   └── data.js               # Categories, conditions & client constants
├── uploads/                  # Uploaded product image files
└── server/
    ├── index.js              # Express app entry point & static file server
    ├── config/
    │   └── db.js             # Mongoose connection & fallback detection
    ├── models/               # Mongoose Schemas (User, Product, Bid, Request, etc.)
    ├── middleware/           # Auth (JWT), Upload (Multer), Rate Limiter, Error Handler
    ├── controllers/          # Controllers for Auth, Products, Bids, Requests, Chats, Reviews, Admin
    ├── routes/               # Modular Express API routes
    ├── services/             # Auction scheduler, Email service, DB adapter
    ├── scripts/
    │   └── seed.js           # Database seeder with sample accounts, auctions & reviews
    └── tests/
        └── runTests.js       # Automated 12-test integration test suite
```

---

## 🚀 Quick Setup & Execution (Windows Instructions)

### 1. Prerequisites
- **Node.js**: Version 16.x or newer (check via `node -v`).
- **Git** (optional, for cloning).

### 2. Installation
Open PowerShell or Command Prompt in the project folder:

```powershell
# Navigate to the project directory
cd C:\Users\Anil\.gemini\antigravity\scratch\mit-exchange-hub

# Install all dependencies
npm install
```

### 3. Seed Sample Database
Populate demo users (Student, Staff, Admin), marketplace listings, live auctions, bids, and sample chats:

```powershell
npm run seed
```

### 4. Start the Application
Run the development server:

```powershell
npm run dev
```

The application will start immediately:
```text
======================================================
🎓 MIT CAMPUS EXCHANGE HUB — FULL-STACK APPLICATION
🚀 Server running on: http://localhost:5000
📦 Serving frontend from: public/
🖼️  Serving uploads from:  uploads/
🛡️  Role-based auth: Student, Staff, Admin
🔨 Bidding & Auction Engine: ACTIVE
======================================================
```

Open your browser and navigate to: **`http://localhost:5000`**

---

## 🗄️ Database Configuration (MongoDB)

The project includes an intelligent **Dual-Mode Data Access Layer**:

### Mode A: Zero-Config Embedded Persistence (Default Fallback)
If you do not have MongoDB installed on your computer, you do **not** need to install anything! The server will automatically detect that MongoDB is not running and activate built-in persistent storage at `server/data/db.json`. All users, bids, listings, requests, chats, and reviews will persist across server restarts.

### Mode B: Local MongoDB Server
If you have MongoDB Community Server installed locally on Windows:
1. Ensure the MongoDB service is running (or run `mongod`).
2. The default connection string in `.env` is already configured:
   ```env
   MONGODB_URI=mongodb://localhost:27017/mit_exchange_hub
   ```
3. Restart the server with `npm run dev`. It will automatically connect to your local MongoDB database.

### Mode C: MongoDB Atlas (Cloud Database)
1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Obtain your connection string.
3. Update `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/mit_exchange_hub?retryWrites=true&w=majority
   ```
4. Restart the server.

---

## 👥 Pre-Configured Demo Accounts (For Jury Evaluation)

The login screen features **One-Click Fill Buttons** (`Fill`) for instant testing:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Student** | `student@demo.edu` | `demo123` | Aarav Sharma (2nd Year Computer Eng.) |
| **Admin** | `admin@demo.edu` | `demo123` | Campus Admin (Full Moderation Rights) |
| **Staff / Faculty** | `staff@demo.edu` | `demo123` | Prof. Rajesh Verma (IoT & Hardware Listings) |
| **Student** | `priya@demo.edu` | `demo123` | Priya Deshmukh (3rd Year Electronics) |
| **Student** | `rohan@demo.edu` | `demo123` | Rohan Kulkarni (2nd Year Mechanical) |
| **Student** | `sneha@demo.edu` | `demo123` | Sneha Iyer (4th Year Computer Eng.) |
| **Student (Suspended)** | `kabir@demo.edu` | `demo123` | Kabir Nair (Used to demonstrate moderation blocking) |

---

## 🛠️ How to Create the First Administrator Account

There are two straightforward ways to set up an administrator account:

### Method 1: Using the Automated Seeder (Recommended)
Running `npm run seed` automatically seeds `admin@demo.edu` with password `demo123`.

### Method 2: Upgrading any User via the Admin Panel
1. Log in with `admin@demo.edu`.
2. Go to **User Management** in the Admin sidebar.
3. View the user list and assign the **Admin** role to any registered faculty or student account.

---

## 🧪 Running Automated Integration Tests

To verify that all backend controllers, bidding rules, JWT authentication, and request handling pass university-level test requirements, run:

```powershell
npm test
```

### Verified Test Suite Summary (12/12 Passed):
1. ✅ **Institute Email Domain Validation**: Blocks non-institute emails (`@gmail.com`) and accepts `@demo.edu`.
2. ✅ **Password Hashing & Authentication**: Validates `bcryptjs` hashing and rejects incorrect passwords.
3. ✅ **Suspension Enforcement**: Suspended users are barred from logging in.
4. ✅ **Auction Listing Creation**: Creates auction listings with starting bid, minimum increment, and duration.
5. ✅ **Seller Bidding Restriction**: Prevents sellers from bidding on their own listings.
6. ✅ **Floor Price Validation**: Rejects bids below the starting bid.
7. ✅ **Atomic Bid Placement**: Updates current highest bid, bidder name, and increments bid count.
8. ✅ **Minimum Increment Rule**: Rejects bids that do not meet the minimum increment over the current bid.
9. ✅ **Conflict Prevention**: Accepting a purchase request automatically reserves the listing and cancels competing requests.
10. ✅ **Verified Reviews & Fraud Prevention**: Only allowed for completed transactions; blocks duplicate reviews.
11. ✅ **Admin Moderation Controls**: Allows admins to toggle user suspension and view platform activity.
12. ✅ **Auction Expiration & Winner Resolution**: Background scheduler automatically declares the highest bidder as the winner and creates an accepted transaction record.

---

## 📋 Suggested Jury Demonstration Workflow

Follow these steps during your project demonstration:

1. **Login as Student**:
   - On the login screen, click the **Fill** button next to `Student` (`student@demo.edu`).
   - Click **Login**. Notice the personalized welcome toast and student badge.
2. **Experience the Live Bidding / Auction System**:
   - Go to **Browse Items**. Select the **Bidding / Auction Only** filter.
   - Click on *"GATE CSE Master Reference Notes"*.
   - View the **Live Countdown Ticker** (`⏳ 01d 23h 45m 12s`) updating every second.
   - View the **Bidding History** table.
   - Enter a higher bid in the bid box (the minimum valid bid is calculated for you).
   - Click **Place Bid**. Notice the instant banner: *"🎉 You currently have the highest bid!"*
3. **Explore Purchase Requests & Transaction Locking**:
   - Click on any fixed-price product (e.g. *"Engineering Mathematics-III"*).
   - Click **Send Purchase Request**.
   - Navigate to **Purchase Requests** -> **Sent Requests** to view the live status.
4. **Peer-to-Peer Chat**:
   - On any product, click **Chat with Seller**.
   - Type a message and hit **Send**. Notice that messages persist in the database and appear in **My Chats**.
5. **Verified Rating & Reviews**:
   - Under **Purchase Requests**, open a **Completed** transaction.
   - Click **⭐ Rate & Review**. Select 5 stars, type a comment, and submit.
   - View the seller's updated average rating on their profile.
6. **Admin Moderation Dashboard**:
   - Log out and log in as `admin@demo.edu` (`Fill` -> `Admin`).
   - Explore the **Admin Dashboard**: view platform statistics, user management (suspend or activate users), listing moderation, and activity stream.
   - Test suspension: Suspend an account and attempt to log in with it; notice that the system securely blocks login.

---

## 🎓 Viva / Defense Preparation (Q&A for CSE Evaluator)

**Q1: How does the bidding system prevent race conditions if two students bid at the exact same millisecond?**
> *Answer:* Bid validation occurs on the server. The database transaction checks whether the submitted bid is strictly greater than the currently stored highest bid plus the minimum increment. If a simultaneous bid arrived milliseconds earlier, the second request fails server validation with an HTTP 400 error indicating the current highest bid has already changed.

**Q2: How are passwords secured?**
> *Answer:* Passwords are never stored in plain text. We use `bcryptjs` with 10 salt rounds before persisting user documents. During login, `bcrypt.compare()` verifies the candidate password against the stored hash.

**Q3: How do you prevent fraudulent reviews?**
> *Answer:* The `reviewController` enforces two rules: (1) The user must reference a valid `requestId` with status `Completed`, and (2) The user must be a verified participant (buyer or seller) of that specific transaction. Duplicate reviews for the same transaction are rejected.

**Q4: How does the application work if MongoDB is not installed?**
> *Answer:* We implemented an intelligent Data Access Layer (`server/services/dbAdapter.js`). On startup, `connectDB` probes for MongoDB. If unavailable, it seamlessly switches to an embedded file-backed JSON store in `server/data/db.json` with identical CRUD methods and query operators, ensuring the application remains 100% runnable without external dependencies.
