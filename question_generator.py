import anthropic
import json
import random
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
from ratelimit import limits, sleep_and_retry
from threading import Lock
from dotenv import load_dotenv
import os 
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize the Anthropic client
client = anthropic.Anthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY"),
)

# Define the topics and tags for each subject
"""


SUBJECTS = {
    "mechanistic_interpretability": {
        "name": "Mechanistic Interpretability",
        "topics": [
            "Neuron Activation Patterns",
            "Attention Mechanisms Analysis",
            "Feature Visualization Techniques",
            "Model Editing and Intervention"
        ],
        "output_file": "question-app/public/question_bank/mechanistic_interpretability_questions.json"
    },
    "hodgkin_huxley_model": {
        "name": "Hodgkin-Huxley Model",
        "topics": [
            "Ion Channel Dynamics",
            "Action Potential Generation",
            "Membrane Voltage Equations",
            "Model Parameters and Fitting"
        ],
        "output_file": "question-app/public/question_bank/hodgkin_huxley_model_questions.json"
    },
    "git_version_control": {
        "name": "GIT Version Control",
        "topics": [
            "Branching and Merging",
            "Remote Repositories",
            "Git Workflow Strategies",
            "Advanced Git Commands"
        ],
        "output_file": "question-app/public/question_bank/git_version_control_questions.json"
    }
}

"""


SUBJECTS = {
    "principles_of_jainism": {
        "name": "Principles of Jainism",
        "topics": [
            "Ahimsa (Non-violence)",
            "Anekantavada (Many-sided Reality)",
            "Aparigraha (Non-attachment)",
            "Karma and Rebirth"
        ],
        "output_file": "question-app/public/question_bank/principles_of_jainism_questions.json"
    }
}

DIFFICULTIES = ["Easy", "Medium", "Hard"]

# Constants
NUM_THREADS = 5
NUM_QUESTIONS = 15
RATE_LIMIT = 120  # Adjust based on your API rate limit
RATE_LIMIT_PERIOD = 60  # in seconds

# Thread-safe list for storing generated questions
questions = []
questions_lock = Lock()

def generate_prompt(subject: str, topic: str, difficulty: str) -> str:
    return f"""Generate an AP-style {subject} question on the topic of {topic}. 
    The question should be {difficulty} difficulty.
    
    Format the response as a JSON object with the following structure:
    {{
        "Question": "The question text",
        "Answer": "A detailed answer or solution",
        "Difficulty": "{difficulty}",
        "Tags": ["Tag1", "Tag2", "Tag3"]
    }}
    
    Ensure the question is challenging, relevant to real-world {subject} usage, and tests deep understanding of {subject} concepts.
    
    Make sure that your answer is short, concise, and to the point. Avoid unnecessary details or lengthy explanations.
    
    The questions should be unique, well-crafted, concise, and free of grammatical errors."""

@sleep_and_retry
@limits(calls=RATE_LIMIT, period=RATE_LIMIT_PERIOD)
def generate_question(subject_data: dict) -> dict:
    topic = random.choice(subject_data["topics"])
    difficulty = random.choice(DIFFICULTIES)
    
    prompt = generate_prompt(subject_data["name"], topic, difficulty)
    
    try:
        message = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1000,
            temperature=0.7,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        content_text = message.content[0].text
        
        try:
            question = json.loads(content_text)
            return question
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON from API response: {content_text}")
            return None
    except anthropic.APIError as e:
        logger.error(f"API error occurred: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return None

def worker(subject_data: dict) -> None:
    while True:
        question = generate_question(subject_data)
        if question:
            with questions_lock:
                questions.append(question)
                if len(questions) >= NUM_QUESTIONS:
                    break

def generate_questions_for_subject(subject_key: str) -> None:
    global questions
    questions = []
    subject_data = SUBJECTS[subject_key]
    
    start_time = time.time()
    logger.info(f"Starting to generate {NUM_QUESTIONS} questions for {subject_data['name']} using {NUM_THREADS} threads.")

    with ThreadPoolExecutor(max_workers=NUM_THREADS) as executor:
        futures = [executor.submit(worker, subject_data) for _ in range(NUM_THREADS)]
        
        for future in tqdm(as_completed(futures), total=NUM_THREADS, desc=f"Generating {subject_data['name']} questions"):
            future.result()  # This will re-raise any exceptions that occurred in the thread

    logger.info(f"Generated {len(questions)} questions for {subject_data['name']}.")

    # Save questions to a JSON file
    with open(subject_data['output_file'], "w") as f:
        json.dump(questions, f, indent=2)

    logger.info(f"Saved questions to {subject_data['output_file']}")
    logger.info(f"Total time taken for {subject_data['name']}: {time.time() - start_time:.2f} seconds")

def main():
    for subject_key in SUBJECTS:
        generate_questions_for_subject(subject_key)

if __name__ == "__main__":
    main()