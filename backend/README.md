# HealthCareEHR - Backend API

The backend for **HealthCareEHR** is a robust RESTful API built with Node.js and Express, designed for clinical data integrity and high security.

## 🚀 Features

- **RESTful API**: Standardized endpoints for patients, appointments, and clinical data.
- **ORM Integration**: PostgreSQL management via Sequelize.
- **JWT Authentication**: Secure, stateless session management.
- **Data Validation**: Strict schema validation using Joi.
- **Security Middleware**: Helmet, CORS, and Rate Limiting.
- **Audit Trails**: Automated logging of system activities.

## 🛠️ Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Sequelize](https://sequelize.org/)
- **Security**: `bcryptjs`, `jsonwebtoken`, `helmet`, `express-rate-limit`
- **Validation**: `joi`
- **Mailing**: `nodemailer`

## 📦 Installation & Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Environment Configuration:
   Create a `.env` file in the `backend` directory with the following variables:
   ```env
   PORT=5000
   DATABASE_URL=postgres://user:password@localhost:5432/healthcare_ehr
   JWT_SECRET=your_jwt_secret
   ```

3. Run Database Migrations:
   ```bash
   npx sequelize-cli db:migrate
   ```

4. Start the server:
   - Development: `npm run dev`
   - Production: `npm start`

## 📁 Structure

- `src/controllers`: Request handlers.
- `src/models`: Sequelize database models.
- `src/routes`: API route definitions.
- `src/middleware`: Custom Express middleware (auth, error handling).
- `src/migrations`: Database schema versioning.
- `src/config`: Configuration files (database, passport).
