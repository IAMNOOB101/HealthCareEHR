# HealthCareEHR - Frontend

This is the frontend application for the **HealthCareEHR** system, a modern Electronic Health Record platform. Built with React 19 and Vite, it focuses on performance, security, and a premium user experience.

## 🚀 Features

- **Clinical Dashboard**: Real-time visualization of patient data and appointments.
- **Patient Records**: Detailed management of patient demographics and medical history.
- **Appointment System**: Interactive scheduling and management.
- **Secure Auth**: Integration with JWT-based authentication.
- **Responsive Design**: Optimized for various screen sizes using Tailwind CSS 4.

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/)
- **Routing**: [React Router 7](https://reactrouter.com/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Form Handling**: React Hook Form & Yup
- **API Client**: Axios

## 📦 Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## 🔧 Configuration

The frontend communicates with the backend API. Ensure the backend is running and the API URL is correctly configured in your environment variables if applicable.

## 📁 Structure

- `src/components`: Reusable UI components.
- `src/pages`: Main application pages (Dashboard, Patients, etc.).
- `src/store`: Redux slices and store configuration.
- `src/api`: Axios instance and API service calls.
- `src/hooks`: Custom React hooks.
- `src/utils`: Helper functions and constants.
