# HealthCareEHR

A robust, modern Electronic Health Record (EHR) system designed for clinical data integrity, security, and a seamless user experience.

## 🚀 Overview

HealthCareEHR is a full-stack solution for managing healthcare data. It features a high-performance React frontend and a secure Node.js/Express backend, integrated with a PostgreSQL database.

## ✨ Key Features

- **Clinical Dashboard**: Real-time overview of clinical activities and metrics.
- **Patient Management**: Comprehensive patient records, medical history, and demographics.
- **Appointment Scheduling**: Efficient management of clinical visits and provider availability.
- **Progress Notes**: Detailed clinical documentation (Phase 1 Implementation).
- **Document Templates**: Customizable templates for various clinical specialties.
- **Secure Authentication**: JWT-based authentication with role-based access control.
- **Audit Logging**: Comprehensive tracking of system actions for compliance.

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Security**: JWT, BcryptJS, Helmet, CORS, Rate Limiting
- **Validation**: Joi
- **Logging**: Morgan

### Frontend
- **Framework**: React 19 (Vite)
- **State Management**: Redux Toolkit
- **Routing**: React Router 7
- **Styling**: Tailwind CSS 4, Lucide Icons
- **Forms**: React Hook Form, Yup
- **API Client**: Axios

## ⚙️ Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL** (v15 or higher)
- **Docker** (optional, for orchestrating the database)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd HealthCareEHR
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   npm install
   # Configure your .env file
   npm run dev
   ```

3. **Frontend Setup**:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

## 🗄️ Database Management

The project uses Sequelize for database schema management.

- **Run Migrations**: `npx sequelize-cli db:migrate`
- **Undo Migrations**: `npx sequelize-cli db:migrate:undo`

## 📁 Project Structure

- `backend/`: Express API, models, controllers, and database migrations.
- `frontend/`: React application, components, Redux slices, and styles.
- `TECH_STACK.md`: Detailed technical documentation.

## 👥 Authors

- Aadarsh Agrawal
- Aayush Nema
- Abhisek Tiwari
- Abhay Bhargav
- Aadarsh Singh Jadon
- Abhisek Hardia
- Aaditya Baghel
- Aaditya Trivedi
- Aashish Badal
- Vinayak Mishra

## 📄 License

This project is licensed under the ISC License.
