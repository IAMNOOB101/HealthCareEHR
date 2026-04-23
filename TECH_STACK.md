# HealthCareEHR - Technology Stack

This document provides a comprehensive overview of the technologies, frameworks, and libraries used in the **HealthCareEHR** project.


## Backend (API Layer)
The backend is a robust RESTful API built with Node.js and Express, focused on clinical data integrity and security.

- **Runtime**: [Node.js](https://nodejs.org/) (v18+)
- **Framework**: [Express.js](https://expressjs.com/) (v5.2.1) - Modern, fast, and minimalist web framework.
- **Language**: JavaScript (ES Modules)
- **Database & ORM**:
  - **Database**: [PostgreSQL](https://www.postgresql.org/) (v15) - Relational database for structured healthcare data.
  - **ORM**: [Sequelize](https://sequelize.org/) (v6.37.8) - Promise-based Node.js ORM for Postgres.
  - **Migrations**: `sequelize-cli` for database schema version control.
- **Security**:
  - **Authentication**: [JSON Web Tokens (JWT)](https://jwt.io/) for stateless session management.
  - **Encryption**: `bcryptjs` for secure password hashing.
  - **Middleware**: `helmet` (security headers) and `cors` (cross-origin resource sharing).
  - **Rate Limiting**: `express-rate-limit` to prevent brute-force attacks.
- **Validation**: [Joi](https://joi.dev/) (v18.1.2) - Schema description language and data validator.
- **Communication**: `nodemailer` for email services.
- **Monitoring/Logging**: `morgan` for HTTP request logging.


## Frontend (UI Layer)
A modern, responsive, and high-performance single-page application (SPA).

- **Library**: [React](https://react.dev/) (v19.2.4) - The latest version of React for building the user interface.
- **Build Tool**: [Vite](https://vitejs.dev/) (v8.0.4) - Next-generation frontend tooling for fast development and builds.
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/) (v2.11.2) - The official, opinionated, batteries-included toolset for efficient Redux development.
- **Routing**: [React Router](https://reactrouter.com/) (v7.14.0) - Declarative routing for React.
- **Styling**: 
  - **Tailwind CSS** (v4.2.2) - A utility-first CSS framework for rapid UI development.
  - **Icons**: [Lucide React](https://lucide.dev/) - Beautifully simple, pixel-perfect icons.
- **Forms & Validation**:
  - **React Hook Form**: Performant, flexible, and extensible forms.
  - **Yup**: Schema builder for value parsing and validation.
- **HTTP Client**: [Axios](https://axios-http.com/) - Promise-based HTTP client for the browser and Node.js.
- **Utilities**:
  - `date-fns`: Modern JavaScript date utility library.
  - `clsx` & `tailwind-merge`: For dynamic CSS class management.


## DevOps & Tooling
- **Containerization**: [Docker](https://www.docker.com/) & **Docker Compose** used for orchestrating the PostgreSQL database.
- **Version Control**: Git
- **Linting**: [ESLint](https://eslint.org/) for maintaining code quality in both frontend and backend.
- **Environment Management**: `dotenv` for managing sensitive configuration variables.


## Project Structure
- `/backend`: Contains the Express API, models, controllers, and database migrations.
- `/frontend`: Contains the React application, components, Redux slices, and styles.
