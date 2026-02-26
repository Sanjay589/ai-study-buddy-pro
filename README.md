# 🎓 AI Study Buddy Pro

A simple and powerful study assistant that helps you explain topics, summarize notes, and generate quizzes.

### 🚀 How to Run the App

This app works on **Windows, macOS, and Linux**. Follow these simple steps:

#### 1. Get the Code
Clone this repository or download the files to your computer:
```bash
git clone https://github.com/Sanjay589/ai-study-buddy-pro.git
cd ai-study-buddy-pro
```

#### 2. Install Python Requirements
Open your terminal and run:
```bash
pip install -r requirements.txt
```

#### 3. Add Your API Key
1. Create a file named `.env` in the project folder.
2. Paste your API key inside like this:
   ```env
   OPENAI_API_KEY=your_key_here
   GEMINI_API_KEY=your_key_here
   ```

#### 4. Start the App
Run this command to open the app in your browser:
```bash
streamlit run app.py
```

---
### 🔒 Security Note
**Your API keys are never shared.**
This project uses a `.env` file to store your API keys locally. The `.gitignore` file is configured to ensure that your private keys are **never** uploaded to GitHub or shared with others. Anyone running this project must provide their own keys.

---
**Note:** You can use either an OpenAI key or a free Gemini key from Google AI Studio.
