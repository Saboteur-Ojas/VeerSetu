# Veer Setu

### AI-Based Predictive Personnel Stress and Welfare Monitoring System

Veer Setu is a welfare monitoring platform for **Central Armed Police Forces (CAPFs), Armed Forces, police personnel, and other uniformed services**.

The project focuses on identifying early signs of **stress, fatigue, burnout, and related welfare concerns**. The purpose is to help personnel receive support earlier and give counsellors and authorized officers the information they need without exposing unnecessary personal information.

Veer Setu is intended as a **decision-support system**, not as a surveillance or disciplinary tool. The machine learning model provides a risk indication, while assessment and intervention remain with qualified personnel.

---

## Problem

Personnel working in uniformed services often deal with long deployments, irregular schedules, operational pressure, physical fatigue, separation from family, and exposure to difficult situations.

In many cases, welfare concerns are identified through manual observation or self-reporting. This can make it difficult to identify problems early and connect personnel with appropriate support.

Veer Setu addresses this by using available welfare-related indicators to provide an early risk indication and route the information to the appropriate role.

---

## How Veer Setu Works

The system uses different views for different users.

### Personnel

Personnel can access information related to their own welfare and use the system to request support.

Typical functions include:

* Personal welfare and stress assessment
* Fatigue or stress indication
* General recommendations
* Support requests
* Counselling requests
* Relevant personal history

The focus from the personnel side is simple: **understand their current state and access help when needed.**

### Counsellor / Welfare Officer

Counsellors receive information about personnel who may require attention.

They can:

* Review stress and fatigue indicators
* Prioritize cases
* View relevant personnel information
* Record counselling or referral actions
* Track follow-ups
* Monitor welfare trends

The counsellor has access to information needed for welfare intervention rather than unrestricted operational information.

### Commander / Authorized Unit Officer

Commanders receive unit-level information rather than private individual wellness records.

The dashboard provides:

* Unit welfare trends
* Aggregated stress and fatigue indicators
* Deployment and readiness overview
* Weekly summaries
* Unit-level statistics

Individual wellness information is not exposed to commanders by default.

---

## Machine Learning

The current prototype uses **XGBoost** for classification.

The model uses personnel-related indicators such as:

* Sleep and routine patterns
* Workload
* Deployment duration
* Fatigue indicators
* Operational or environmental factors
* Self-reported welfare information
* Other relevant non-sensitive indicators

The output of the model is used as an **early warning signal** that can help prioritize human attention.

### Prototype Results

| Metric    | Result |
| --------- | -----: |
| Accuracy  | 95.77% |
| Precision | 78.86% |
| Recall    | 77.71% |
| F1 Score  | 78.28% |
| ROC-AUC   | 98.07% |

These results are based on the current prototype and evaluation dataset. They are not a substitute for real-world clinical or operational validation.

The model is not intended to independently determine:

* Deployment fitness
* Disciplinary action
* Removal from duty
* Medical diagnosis

Those decisions require appropriate human and institutional processes.

---

## System Architecture

```text
                    ┌─────────────────────┐
                    │      Frontend       │
                    │       React.js      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Authentication &    │
                    │ Role-Based Access   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     Backend API     │
                    │   Node.js/Express   │
                    └───────┬───────┬─────┘
                            │       │
                 ┌──────────┘       └──────────┐
                 ▼                             ▼
        ┌─────────────────┐          ┌─────────────────┐
        │     MongoDB     │          │    ML Service   │
        │    Database     │          │ Python / XGBoost│
        └─────────────────┘          └────────┬────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │ Risk Prediction │
                                     └─────────────────┘
```

The application separates the web application, backend services, database, and machine learning component. Access to protected resources is controlled through role-based authorization.

---

## Security and Access Control

Because the system deals with personnel welfare information, access control is a key part of the design.

### Authentication

The backend uses:

* JWT-based authentication
* Token-based API authorization
* Secure login

### Role-Based Access

The expected access model is:

```text
Personnel
   └── Own welfare information

Counsellor
   └── Assigned personnel welfare information

Commander
   └── Aggregated unit-level information
```

Authorization is enforced at the backend rather than relying only on what is visible in the frontend.

Sensitive API endpoints should validate the user's role and permissions before returning data.

---

## Application Workflow

```text
Personnel Data
      |
      v
Data Validation
      |
      v
Feature Processing
      |
      v
XGBoost Model
      |
      v
Risk Indication
      |
      +----------------------+
      |                      |
      v                      v
Counsellor Review      Unit-Level Monitoring
      |
      v
Counselling / Support
```

The workflow keeps the prediction stage separate from the final welfare decision. The model highlights cases that may need attention, while the response is handled by the appropriate human role.

---

## Technology Stack

### Frontend

* React.js
* JavaScript / TypeScript
* Dashboard UI
* Data visualization and charts

### Backend

* Node.js
* Express.js
* REST APIs
* JWT Authentication
* Role-Based Access Control

### Database

* MongoDB

### Machine Learning

* Python
* XGBoost
* Pandas
* NumPy
* Scikit-learn

### Development

* Git
* GitHub
* Google Colab for ML experimentation

---

## Project Structure

```text
Veer-Setu/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── dashboards/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
│
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── server.js
│
├── ml/
│   ├── dataset/
│   ├── notebooks/
│   ├── preprocessing/
│   ├── models/
│   └── prediction.py
│
├── docs/
│   ├── architecture/
│   └── screenshots/
│
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

Install the following before running the project:

* Node.js
* npm
* Python 3.x
* MongoDB
* Git

### Clone the Repository

```bash
git clone https://github.com/<your-username>/veer-setu.git
cd veer-setu
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd ../backend
npm install
npm run dev
```

### Machine Learning Environment

```bash
cd ../ml
python -m venv venv
```

On Windows:

```bash
venv\Scripts\activate
```

On Linux/macOS:

```bash
source venv/bin/activate
```

Then install the required Python packages:

```bash
pip install -r requirements.txt
```

---

## Environment Variables

Create a `.env` file inside the backend directory.

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
ML_SERVICE_URL=your_ml_service_url
```





## Privacy Considerations

The system is designed around limiting access to personnel information based on role.

The main considerations are:

**Data minimization**
Only information needed for the intended welfare functions should be collected.

**Role separation**
Personnel, counsellors, and commanders should not have the same level of access.

**Human review**
A prediction should result in review or support, not an automatic operational decision.

**Auditability**
Access to sensitive information and important system actions should be logged.



## Limitations

Veer Setu is currently a **prototype**.

The model's performance depends on the quality and distribution of the available dataset. Real-world deployment would require additional validation, including security testing, privacy review, bias evaluation, domain validation, and operational testing.

The current model should not be treated as a clinical diagnostic system or as an autonomous system for operational decisions.


## Future Development

Planned areas of development include:

* Personalized baseline modelling
* Time-series stress prediction
* Explainable model outputs
* Wearable integration with explicit consent
* Offline or edge-based inference
* Multilingual support
* Improved alert prioritization
* Long-term welfare trend analysis
* Privacy-preserving analytics
* More detailed unit-level reporting

---

## Project Information

**Project:** Veer Setu
**Problem Statement:** SIH PS 26186
**Project Type:** Smart India Hackathon

Veer Setu is built around a practical separation of responsibilities: personnel can access support, counsellors can review cases that need attention, and authorized commanders can understand the broader welfare and readiness status of their units.
