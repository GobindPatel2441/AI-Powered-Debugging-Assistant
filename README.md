# DebugAI 🚀 - Smart AI-Powered Debugging Assistant

DebugAI is a sophisticated full-stack application designed to streamline the debugging process for developers. It leverages Artificial Intelligence to provide instant explanations and solutions for code errors and parses complex log files to highlight critical issues.

Built with a modern stack featuring **Node.js, Express, MongoDB**, and a **Vite-powered frontend**, DebugAI transforms cryptic stack traces into actionable insights.

---

## ✨ Core Functionality

### 1. AI Error Analysis
- **What it does:** Users can paste any error message, stack trace, or buggy code snippet into the "Analyze Error" interface.
- **How it works:** 
    - The backend uses the `aiService.js` to communicate with AI models (supporting OpenAI GPT-4o-mini).
    - It returns a structured response containing an **Explanation**, a **Suggested Fix**, and **Example Code**.
    - **Offline/Mock Mode:** If no API key is provided, the system uses a local regex-based analyzer to provide helpful responses for common errors.

### 2. Intelligent Log Parsing
- **What it does:** Allows users to upload `.log`, `.txt`, or `.json` files for automated diagnostic scanning.
- **How it works:**
    - The `logParserService.js` scans the file content using a robust regex engine.
    - It identifies lines containing keywords like `ERROR`, `CRITICAL`, `EXCEPTION`, `FAILED`, etc.
    - It automatically assigns **Severity Levels** (INFO, WARNING, ERROR, CRITICAL) and extracts line numbers.

### 3. Debugging History
- **What it does:** Every analysis performed is saved in a history log for future reference.
- **How it works:**
    - The `historyService.js` manages data persistence.
    - It uses **MongoDB (via Mongoose)** if a connection string is provided, or falls back to an **In-Memory** system for lightweight local development.

---

## 🛠️ Technical Architecture

### **Frontend**
- **Technology:** Vanilla JavaScript, HTML5, and CSS3.
- **Build Tool:** [Vite](https://vitejs.dev/) for fast development and bundling.
- **Features:**
    - **Responsive Dashboard:** Modern, multi-page layout.
    - **Theme Engine:** Persistent Light/Dark mode switching.
    - **Notification System:** Real-time feedback for user actions.

### **Backend**
- **Technology:** Node.js with [Express](https://expressjs.com/).
- **Key Services:**
    - `aiService.js`: Integration with AI providers.
    - `logParserService.js`: Advanced regex and JSON parsing logic.
    - `databaseService.js`: Mongoose schema and connection management.

---

## 📁 Project Structure

```text
/
├── backend/                # Express API & Business Logic
│   ├── controllers/        # Request handlers
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API endpoint definitions
│   ├── services/           # Core logic (AI, Parsing, History)
│   └── server.js           # Entry point
├── frontend/               # Vite Static Frontend
│   ├── src/                # JavaScript logic
│   ├── assets/             # Styles and assets
│   ├── index.html          # Dashboard entry
│   └── ...                 # Modular page files
├── package.json            # Global scripts for the project
└── .env                    # Environment configuration
```

---

## 🚀 Getting Started

### 1. Environment Setup
Create a `.env` file in the root or `backend/` directory:

```env
MONGO_URI=mongodb://127.0.0.1:27017/debugai
OPENAI_API_KEY=your_key_here
PORT=5000
```
*Note: `OPENAI_API_KEY` and `MONGO_URI` are optional. The app will use mock data and in-memory storage if they are missing.*

### 2. Installation
Install dependencies for both frontend and backend:
```bash
npm run install:all
```

### 3. Running the App
Start the backend:
```bash
npm run dev:backend
```
Start the frontend:
```bash
npm run dev:frontend
```
The application will be available at `http://localhost:5173`.

---

## 💡 Future Roadmap
- **IDE Integration:** Extensions for VS Code and JetBrains.
- **Context-Aware AI:** Support for project-wide code context.
- **Real-time Log Streaming:** Live diagnostic monitoring.
- **Collaborative Debugging:** Shared analysis sessions.

---
Created with ❤️ by [Gobind Patel](https://github.com/GobindPatel2441)
