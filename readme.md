# Veer Setu Backend

Backend service for **Veer Setu**, an AI-assisted personnel stress and welfare monitoring system designed for CAPFs, Armed Forces, police personnel, and other uniformed services.

The backend is responsible for authentication, authorization, user and personnel data, welfare records, dashboard data, and communication with the machine learning service.

---

## Overview

The backend provides the API layer between the frontend, database, and machine learning component.

```text
Frontend
   |
   | HTTP / REST API
   v
Node.js + Express
   |
   +----------------------+
   |                      |
   v                      v
MongoDB              ML Service
   |                      |
   |                      v
   |                Risk Prediction
   |                      |
   +----------<-----------+
```

The backend also controls what information each user can access through **JWT authentication and role-based access control**.

---

## Backend Responsibilities

The server handles the main application logic of Veer Setu:

* User authentication and session authorization
* Role-based access control
* Personnel profile management
* Welfare and assessment data
* Stress and fatigue records
* Counsellor case management
* Unit-level dashboard data
* Support and counselling requests
* Communication with the ML prediction service
* API validation
* Database operations
* Error handling
* Access control for protected resources

The frontend is responsible for the interface. The backend is responsible for deciding **what data can actually be accessed and what operations a user is allowed to perform**.

---

# Technology Stack

### Runtime

* Node.js

### Framework

* Express.js

### Database

* MongoDB

### Authentication

* JSON Web Tokens (JWT)

### API

* REST API

### Machine Learning Integration

* Python-based ML service
* XGBoost model

### Development

* Git
* GitHub
* dotenv
* npm

---

# Request Flow

A typical request follows this flow:

```text
Client Request
      |
      v
Express Router
      |
      v
Authentication Middleware
      |
      v
Authorization / RBAC
      |
      v
Controller
      |
      v
Service / Business Logic
      |
      v
MongoDB
      |
      v
Response
```

For requests that require an ML prediction:

```text
Client
  |
  v
Backend API
  |
  v
Validate Input
  |
  v
ML Service
  |
  v
XGBoost Prediction
  |
  v
Prediction Result
  |
  v
Backend
  |
  v
Store / Return Result
```

This keeps the machine learning component separate from the main application server.

---

# Authentication

Veer Setu uses **JWT-based authentication**.

After successful login, the server generates an access token that is used for protected API requests.

Example:

```http
Authorization: Bearer <JWT_TOKEN>
```

Protected routes verify the token before allowing access to the requested resource.

Authentication answers:

> Who is making this request?

Authorization answers:

> What is this user allowed to access?

Both are handled separately.

---

# Role-Based Access Control

The backend uses user roles to restrict access to sensitive information.

The main roles are:

```text
Personnel
Counsellor / Welfare Officer
Commander / Authorized Unit Officer
```

### Personnel

Personnel can access their own relevant welfare information and submit support or counselling requests.

### Counsellor

Counsellors can access welfare information for personnel assigned to them and manage counselling-related records.

### Commander

Commanders receive unit-level and aggregated information relevant to welfare and readiness rather than unrestricted private personnel records.

---

## Authorization Flow

```text
Request
   |
   v
JWT Verification
   |
   v
Identify User
   |
   v
Check Role
   |
   v
Check Resource Ownership / Scope
   |
   +------ Allowed ------> Controller
   |
   +------ Denied -------> 403 Forbidden
```

Role checks should be performed on the backend.

Hiding a button in the frontend does not prevent someone from directly calling the API.

---

# API Structure

The backend is organized around separate route groups.

A typical structure is:

```text
/api
│
├── /auth
│   ├── login
│   ├── register
│   └── profile
│
├── /personnel
│   ├── profile
│   ├── assessment
│   ├── welfare
│   └── support
│
├── /counsellor
│   ├── personnel
│   ├── cases
│   ├── referrals
│   └── followups
│
├── /commander
│   ├── unit
│   ├── readiness
│   ├── welfare
│   └── reports
│
└── /prediction
    └── risk
```

> The exact routes depend on the implementation in the repository.

---

# Controller Layer

Controllers receive HTTP requests and return responses.

They are responsible for coordinating the request rather than containing every part of the application's business logic.

Typical controller responsibilities include:

```text
Receive Request
      ↓
Read Parameters / Body
      ↓
Validate Request
      ↓
Call Business Logic
      ↓
Handle Result
      ↓
Return HTTP Response
```

Example structure:

```text
controllers/
├── authController.js
├── personnelController.js
├── counsellorController.js
├── commanderController.js
└── predictionController.js
```

---

# Middleware

Middleware runs between the incoming request and the controller.

Important middleware includes:

### Authentication Middleware

Verifies the JWT and identifies the logged-in user.

### Authorization Middleware

Checks whether the authenticated user has the required role.

### Validation Middleware

Checks incoming request data before it reaches the application logic.

Example:

```text
Request
   ↓
JWT Middleware
   ↓
Role Middleware
   ↓
Validation Middleware
   ↓
Controller
```

---

# Database

MongoDB is used for storing application data.

Depending on the implementation, the database can contain information such as:

* User accounts
* Personnel profiles
* Roles
* Welfare assessments
* Stress/fatigue indicators
* Counselling records
* Support requests
* Unit information
* Prediction results
* Relevant timestamps and status fields

Sensitive information should only be returned through APIs that enforce the appropriate user scope.

---

# Machine Learning Integration

The ML component is kept separate from the Node.js backend.

The backend prepares the required input and sends it to the ML service.

```text
Personnel / Welfare Data
          |
          v
      Backend
          |
          v
   Feature Preparation
          |
          v
      ML Service
          |
          v
    XGBoost Model
          |
          v
   Risk Prediction
          |
          v
      Backend
          |
          v
    API Response
```

The prediction is treated as an **early warning indicator**.

It is not intended to automatically make decisions regarding deployment, disciplinary action, medical diagnosis, or removal from duty.

---

# Error Handling

The API should return appropriate HTTP status codes rather than exposing internal server errors to clients.

Typical responses include:

```text
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
500 Internal Server Error
```

A consistent error response makes it easier for the frontend to handle failures.

Example:

```json
{
  "success": false,
  "message": "Access denied"
}
```

---

# Security Considerations

Because Veer Setu deals with sensitive welfare information, security is part of the backend design.

Important controls include:

* JWT authentication
* Role-based authorization
* Server-side permission checks
* Input validation
* Environment variables for secrets
* Restricted database access
* Controlled API responses
* Error handling without exposing internal details
* Logging of important operations where required

The backend should never rely on frontend restrictions as an access-control mechanism.

---

# Environment Variables

Create a `.env` file in the backend root directory.

Example:

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

ML_SERVICE_URL=your_ml_service_url
```

Depending on the implementation, additional variables may be required.

Never commit the `.env` file or production credentials to GitHub.

Add it to `.gitignore`:

```gitignore
.env
node_modules/
```

---

# Project Structure

A clean backend structure can look like this:

```text
backend/
│
├── controllers/
│   ├── authController.js
│   ├── personnelController.js
│   ├── counsellorController.js
│   ├── commanderController.js
│   └── predictionController.js
│
├── middleware/
│   ├── authMiddleware.js
│   ├── roleMiddleware.js
│   └── validationMiddleware.js
│
├── models/
│   ├── User.js
│   ├── Personnel.js
│   ├── Assessment.js
│   ├── Welfare.js
│   └── ...
│
├── routes/
│   ├── authRoutes.js
│   ├── personnelRoutes.js
│   ├── counsellorRoutes.js
│   ├── commanderRoutes.js
│   └── predictionRoutes.js
│
├── services/
│   ├── mlService.js
│   └── ...
│
├── utils/
│   └── ...
│
├── .env
├── .gitignore
├── package.json
└── server.js
```

The actual folder and file names should match the repository implementation.

---

# Running the Backend

## 1. Clone the repository

```bash
git clone https://github.com/<your-username>/<backend-repository>.git
cd <backend-repository>
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

Create `.env` and add the required configuration.

## 4. Start the server

For development:

```bash
npm run dev
```

For a standard Node.js start script:

```bash
npm start
```

The API will run on the configured port.

Example:

```text
http://localhost:5000
```

---

# Development Flow

For a normal feature, the backend flow is:

```text
Route
  ↓
Middleware
  ↓
Controller
  ↓
Business Logic
  ↓
Database / ML Service
  ↓
Response
```

Keeping these responsibilities separate makes the code easier to maintain and reduces the amount of logic inside individual route handlers.

---

# Backend and Frontend Communication

The frontend communicates with the backend through REST APIs.

```text
React Frontend
       |
       | JSON / HTTP
       v
Express Backend
       |
       | MongoDB operations
       v
    Database
```

Authenticated requests include the JWT token so the backend can determine the identity and role of the requester.

The frontend should never directly access protected database resources.

---

# Backend and ML Service

The machine learning model is not responsible for user authentication, database access, or role management.

Those responsibilities remain with the backend.

```text
                  VEER SETU BACKEND
                         |
        ┌────────────────┼────────────────┐
        |                |                |
        v                v                v
   Authentication    Database        ML Service
        |                                 |
        v                                 v
      RBAC                         XGBoost Model
        |                                 |
        └──────────────┬──────────────────┘
                       v
                  API Response
```

This separation also makes it possible to update or replace the ML model without rebuilding the entire backend.

---

# Current Prototype

The backend currently forms the core application layer connecting the user-facing dashboards with the database and prediction service.

The main design focus is:

```text
Authentication
      +
Authorization
      +
Personnel Data
      +
Welfare Data
      +
ML Prediction
      +
Role-Specific APIs
```

The system is currently a prototype and would require additional security, infrastructure, validation, and testing before deployment in a real operational environment.

---

# Future Backend Improvements

Possible backend improvements include:

* API rate limiting
* Centralized request logging
* Audit logs for sensitive operations
* Refresh-token based authentication
* More granular permissions
* Input schema validation
* API documentation with OpenAPI/Swagger
* Automated testing
* Database indexing and query optimization
* Background jobs for reports and notifications
* Improved ML service failure handling
* Encryption and stronger production security controls

---

## Project Information

**Project:** Veer Setu
**Problem Statement:** SIH PS 26186
**Repository:** Backend
**Purpose:** API, authentication, authorization, data management, and ML integration
