import streamlit as st
import os
import json
from openai import OpenAI
import google.generativeai as genai
from dotenv import load_dotenv
from prompts import build_system_prompt, TaskType, Difficulty
from rag import index_document, retrieve_context, has_documents

load_dotenv()

# Page configuration
st.set_page_config(
    page_title="AI Study Buddy Pro",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for better layout
st.markdown("""
    <style>
    .main > div {
        padding-top: 2rem;
    }
    .stButton > button {
        height: 3rem;
        font-weight: 600;
    }
    .result-container {
        padding: 1.5rem;
        border-radius: 0.5rem;
        border: 1px solid #e0e0e0;
        background-color: #fafafa;
        margin-top: 1rem;
    }
    /* Fix for the narrow result issue */
    [data-testid="column"] {
        width: 100% !important;
    }
    </style>
    """, unsafe_allow_html=True)

# Initialize session state
if "session_id" not in st.session_state:
    import uuid
    st.session_state.session_id = str(uuid.uuid4())
if "difficulty" not in st.session_state:
    st.session_state.difficulty = "intermediate"
if "history" not in st.session_state:
    st.session_state.history = []
if "uploaded_file_name" not in st.session_state:
    st.session_state.uploaded_file_name = None
if "chunks_indexed" not in st.session_state:
    st.session_state.chunks_indexed = 0
if "provider" not in st.session_state:
    st.session_state.provider = "Gemini (Free Tier Available)"
if "active_task" not in st.session_state:
    st.session_state.active_task = None

# Backend configuration - keys are handled here only
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Sidebar
with st.sidebar:
    st.title("🎓 Study Buddy Pro")
    st.markdown("---")
    
    st.subheader("Provider Settings")
    st.session_state.provider = st.selectbox(
        "Select AI Provider",
        ["OpenAI", "Gemini (Free Tier Available)"],
        index=1 if "Gemini" in st.session_state.provider else 0
    )
    
    # Provider-specific checks
    if "OpenAI" in st.session_state.provider:
        if not OPENAI_API_KEY:
            st.error("OpenAI API Key missing in backend (.env file)")
    else:
        if not GEMINI_API_KEY:
            st.info("Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey)")
            st.error("Gemini API Key missing in backend (.env file)")

    st.markdown("---")
    st.subheader("Settings")
    st.session_state.difficulty = st.selectbox(
        "Difficulty Level",
        ["beginner", "intermediate", "advanced"],
        index=["beginner", "intermediate", "advanced"].index(st.session_state.difficulty)
    )
    
    st.markdown("---")
    st.subheader("Knowledge Base")
    uploaded_file = st.file_uploader("Upload notes (PDF/Text)", type=["txt", "pdf"])
    
    current_provider = "openai" if "OpenAI" in st.session_state.provider else "gemini"
    current_key = OPENAI_API_KEY if current_provider == "openai" else GEMINI_API_KEY

    if uploaded_file and st.session_state.uploaded_file_name != uploaded_file.name:
        if not current_key:
            st.error("Missing API Key in backend configuration.")
        else:
            with st.spinner("Indexing document..."):
                if uploaded_file.type == "text/plain":
                    text = uploaded_file.read().decode("utf-8")
                else:
                    text = "PDF support requires extra libraries. Reading as plain text for now."
                
                if current_provider == "openai":
                    client = OpenAI(api_key=current_key)
                else:
                    genai.configure(api_key=current_key)
                    client = genai
                
                chunks_indexed = index_document(client, st.session_state.session_id, text, provider=current_provider)
                st.session_state.chunks_indexed = chunks_indexed
                st.session_state.uploaded_file_name = uploaded_file.name
                st.success(f"Indexed {chunks_indexed} chunks from {uploaded_file.name}")

    if st.session_state.uploaded_file_name:
        st.info(f"Active Document: {st.session_state.uploaded_file_name}")
        st.caption(f"{st.session_state.chunks_indexed} chunks indexed")

# Main Content
st.title("What are we studying today?")
user_input = st.text_area("Enter a topic or paste text to study...", 
                         placeholder="e.g., Quantum entanglement, French Revolution, or paste your notes here.",
                         height=150)

# Task Buttons
col1, col2, col3, col4 = st.columns(4)

with col1:
    if st.button("💡 Explain", use_container_width=True):
        st.session_state.active_task = "explain"

with col2:
    if st.button("📄 Summarize", use_container_width=True):
        st.session_state.active_task = "summarize"

with col3:
    if st.button("❓ Quiz", use_container_width=True):
        st.session_state.active_task = "quiz"

with col4:
    if st.button("🗂️ Flashcards", use_container_width=True):
        st.session_state.active_task = "flashcards"

def handle_request(task_type: TaskType):
    current_provider = "openai" if "OpenAI" in st.session_state.provider else "gemini"
    current_key = OPENAI_API_KEY if current_provider == "openai" else GEMINI_API_KEY

    if not current_key:
        st.error(f"Please configure your {st.session_state.provider} API Key in the backend .env file.")
        return
        
    if not user_input.strip():
        st.error("Please enter some text or a topic to study.")
        return

    if current_provider == "openai":
        client = OpenAI(api_key=current_key)
    else:
        genai.configure(api_key=current_key)
        client = genai

    # Retrieve context if documents exist
    rag_context = []
    if has_documents(st.session_state.session_id):
        rag_context = retrieve_context(client, st.session_state.session_id, user_input, provider=current_provider)

    system_prompt = build_system_prompt(task_type, st.session_state.difficulty, rag_context)
    
    try:
        # Full width result area
        st.markdown("---")
        
        if task_type in ["explain", "summarize"]:
            with st.status(f"Generating {task_type.capitalize()}...", expanded=True) as status:
                st.write("Thinking...")
                
                full_response = ""
                message_placeholder = st.empty()
                
                if current_provider == "openai":
                    response = client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_input}
                        ],
                        stream=True
                    )
                    for chunk in response:
                        if chunk.choices[0].delta.content:
                            full_response += chunk.choices[0].delta.content
                            message_placeholder.markdown(full_response + "▌")
                else:
                    model = genai.GenerativeModel('gemini-flash-latest', system_instruction=system_prompt)
                    response = model.generate_content(user_input, stream=True)
                    for chunk in response:
                        full_response += chunk.text
                        message_placeholder.markdown(full_response + "▌")
                
                message_placeholder.markdown(full_response)
                status.update(label=f"{task_type.capitalize()} Complete!", state="complete", expanded=True)
            
            st.session_state.history.insert(0, {
                "task": task_type,
                "input": user_input[:50] + "...",
                "result": full_response
            })

        elif task_type == "quiz":
            with st.spinner("Generating Quiz..."):
                if current_provider == "openai":
                    response = client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_input}
                        ],
                        response_format={"type": "json_object"}
                    )
                    data = json.loads(response.choices[0].message.content)
                else:
                    model = genai.GenerativeModel('gemini-flash-latest', system_instruction=system_prompt)
                    response = model.generate_content(user_input)
                    text = response.text.strip()
                    if "```json" in text:
                        text = text.split("```json")[1].split("```")[0].strip()
                    data = json.loads(text)
                
                st.subheader("📝 Practice Quiz")
                score = 0
                for i, q in enumerate(data["questions"]):
                    st.markdown(f"**Q{i+1}: {q['question']}**")
                    choice = st.radio(f"Select an answer for Q{i+1}", q["options"], key=f"q_{i}")
                    if choice == q["answer"]:
                        st.success("Correct!")
                        score += 1
                    else:
                        st.info(f"Correct answer: {q['answer']}")
                
                st.metric("Final Score", f"{score}/{len(data['questions'])}")
                
        elif task_type == "flashcards":
            with st.spinner("Generating Flashcards..."):
                if current_provider == "openai":
                    response = client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_input}
                        ],
                        response_format={"type": "json_object"}
                    )
                    data = json.loads(response.choices[0].message.content)
                else:
                    model = genai.GenerativeModel('gemini-flash-latest', system_instruction=system_prompt)
                    response = model.generate_content(user_input)
                    text = response.text.strip()
                    if "```json" in text:
                        text = text.split("```json")[1].split("```")[0].strip()
                    data = json.loads(text)
                
                st.subheader("🗂️ Study Flashcards")
                # Grid for flashcards
                f_col1, f_col2 = st.columns(2)
                for i, card in enumerate(data["flashcards"]):
                    with (f_col1 if i % 2 == 0 else f_col2):
                        with st.expander(f"Card {i+1}: {card['question']}"):
                            st.markdown(f"**Answer:** {card['answer']}")

    except Exception as e:
        if "insufficient_quota" in str(e):
            st.error("OpenAI Quota Exceeded. Please check your billing or switch to Gemini in the sidebar.")
        else:
            st.error(f"An error occurred: {str(e)}")

# Execute the task outside the column context for full width
if st.session_state.active_task:
    handle_request(st.session_state.active_task)
    # Note: We don't clear active_task here to allow radio button interactions in Quiz
    # but we should clear it if the user changes the input or provider.

# History Section
if st.session_state.history:
    st.markdown("---")
    st.subheader("Recent Activity")
    for item in st.session_state.history[:5]:
        with st.expander(f"{item['task'].capitalize()}: {item['input']}"):
            st.markdown(item["result"])
