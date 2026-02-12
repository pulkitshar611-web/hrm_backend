# HRM Backend

Modular Express.js backend for the HRM platform using Prisma ORM and MySQL.

## Prerequisites
- Node.js (v18+)
- MySQL Server

## Setup Instructions

1. **Environment Configuration**
   - The `.env` file has been created in `backend/`.
   - Update `DATABASE_URL` with your MySQL credentials:
     `DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/hrm_db"`

2. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Database Migration**
   Run the following to initialize your database:
   ```bash
   npm run prisma:migrate -- --name init
   ```

4. **Seed Initial Data**
   Create initial Admin users and Company:
   ```bash
   npm run prisma:seed
   ```

5. **Start Server**
   ```bash
   npm run dev
   ```

## API Features (Phase 1)
- **Auth:** Login, Token Refresh, Logout.
- **Employees:** Full CRUD for Admin role.
- **Companies:** Manage multi-tenant company context.
- **Dashboard:** Real-time system metrics.

## Security
- JWT Access Tokens (15m)
- Secure Refresh Tokens (7d)
- Role-Based Access Control (RBAC) middleware.
- Standardized Error Handling.
