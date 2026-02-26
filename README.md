# 🎓 AI Study Buddy Pro

An intelligent, multi-provider study assistant designed to help students explain complex topics, summarize notes, generate practice quizzes, and create flashcards.

---

### 🤖 Built by AI Agent
This project was autonomously developed and configured by an **AI Coding Agent** in collaboration with the user. The agent performed the following tasks:
- **Full-Stack Implementation**: Built the Streamlit interface and integrated it with multiple LLM providers.
- **RAG Architecture**: Designed a Retrieval-Augmented Generation system to process and retrieve context from user documents.
- **Multi-Provider Support**: Implemented a fail-safe system supporting both **OpenAI (GPT-4o-mini)** and **Google Gemini (1.5 Flash)**.
- **UI/UX Optimization**: Refactored the layout for full-width responsiveness and better readability.
- **Security & Deployment**: Configured backend environment variables, `.gitignore`, and GitHub repository synchronization.

---

### 🚀 Key Features
- **💡 Smart Explainer**: Detailed, multi-level explanations of any topic.
- **📄 Document Summarizer**: Quick summaries of uploaded notes or pasted text.
- **📝 Interactive Quizzes**: Generate and take practice tests with instant feedback.
- **🗂️ Flashcard Generator**: Automatically create study decks from your materials.
- **📂 Knowledge Base**: Upload PDF or TXT files for AI-powered context retrieval.

### 🛠️ Setup Instructions
1. **Clone the repository**:
   ```bash
   git clone https://github.com/Sanjay589/ai-study-buddy-pro.git
   cd ai-study-buddy-pro
   ```
2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # macOS/Linux
   # venv\Scripts\activate   # Windows
   ```
3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Configure your API keys**:
   Create a `.env` file and add:
   ```env
   OPENAI_API_KEY=your_key_here
   GEMINI_API_KEY=your_key_here
   ```
5. **Run the app**:
   ```bash
   streamlit run app.py
   ```

---
*Created during an AI-assisted pair programming session.*
