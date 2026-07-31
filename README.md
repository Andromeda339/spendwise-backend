# SpendWise API (Backend)

A RESTful API service for a personal finance management application. It provides robust backend infrastructure to handle multi-currency accounts, track expenses, manage shared family budgets, and automatically parse receipt data.

## 🚀 Key Features

* **Secure Authentication:** User registration and login using JWT (JSON Web Tokens).
* **Database Management:** Efficient relational database architecture managed with Prisma ORM and PostgreSQL.
* **Smart Receipt Scanning:** Integration with a third-party OCR service and Regex-based parsing to automatically extract expense amounts from receipt images.
* **Financial Logic:** Full CRUD operations for transactions, multi-currency accounts, and shared family budgets.

## 🛠 Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** PostgreSQL
* **ORM:** Prisma
* **Security:** JWT (JSON Web Tokens)

## ⚙️ Local Setup & Installation

### 1. Clone the repository
git clone <your_new_repository_url_here>
cd spendwise-api

### 2. Install dependencies
npm install

### 3. Setup Database
Create a new PostgreSQL database (e.g., finance_db).

### 4. Configure Environment Variables
Create a .env file in the root directory and copy the contents from .env.example. Make sure to update it with your actual credentials:

DATABASE_URL="postgresql://user:password@localhost:5432/finance_db?schema=public"
JWT_SECRET="your_super_secret_key"
PORT=3000

### 5. Run Prisma Migrations
Sync your database schema:
npx prisma migrate dev

### 6. Start the Server
Run the application in development mode:
npm run dev

The server will start on http://localhost:3000.

## 🧪 Testing API
All endpoints have been rigorously tested. You can import the provided Postman collection (if available in the repository) to test the routes locally.