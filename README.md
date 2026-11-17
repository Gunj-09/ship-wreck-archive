# Shipwreck Archive PERN Application

A full-stack PERN (PostgreSQL, Express.js, React, Node.js) CRUD & Analytics application connecting to your local pgAdmin database **`Ship Wreck Archieve`**.

---

## Project Structure

```text
Pg Admin Data/
├── PRD.md                  # Detailed Product Requirements Document
├── server/                 # Express backend API & PostgreSQL pool
│   ├── .env                # Database configuration
│   ├── db.js               # PostgreSQL connection pool (pg)
│   ├── index.js            # REST API endpoints (CRUD & Metrics)
│   └── package.json
└── client/                 # React frontend with Vite & Lucide icons
    ├── src/
    │   ├── App.jsx         # Navigable UI: Dashboard, Wrecks, Artifacts, Expeditions
    │   ├── App.css         # Maritime dark-theme UI styling
    │   └── main.jsx
    └── package.json
```

---

## 1. Quick Setup & Configuration

Open [server/.env](file:///c:/Users/user/Desktop/Pg%20Admin%20Data/server/.env) and update your PostgreSQL password (set during your PostgreSQL / pgAdmin installation):

```env
PORT=5000
DB_USER=postgres
DB_PASSWORD=your_actual_pgadmin_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Ship Wreck Archieve
```

To test the database connection after updating `.env`:
```powershell
cd server
node test_db.js
```
When successful, you will see `CONNECTED_SUCCESSFULLY`.

---

## 2. Running the Application

### Start the Backend Server (Port 5000)
Open a terminal in the project directory:
```powershell
cd server
npm start
# or: node index.js
```
The server will listen at `http://localhost:5000`.

### Start the Frontend Client (Port 5173)
Open a second terminal:
```powershell
cd client
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 3. Features Included

* **Dashboard & Metrics**:
  * Total Wrecks, Cataloged Artifacts, Logged Expeditions, and Research Funding cards.
  * Nationality and Artifact Condition distribution graphs.
* **Shipwreck Directory (Full CRUD)**:
  * **Create**: Add new shipwreck records with the modal form.
  * **Read**: Filter and live-search vessels by name, nationality, or type.
  * **Update**: Edit existing wrecks with pre-populated form fields.
  * **Delete**: Delete records with confirmation dialog.
* **Artifacts & Expeditions View**:
  * Browse recovered items and research expedition logs directly.
