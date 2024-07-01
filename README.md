# TopicQA.AI

Imagine you're a curious learner, a dedicated student, or a professional looking to master a new subject quickly. You've tried flashcards, textbooks, and generic online quizzes, but nothing seems to capture the depth of knowledge you're after. Enter TopicQA.AI, your personal learning companion that transforms any topic into an interactive, tailored learning experience. With just a few clicks, you can generate a comprehensive question bank on anything from quantum physics to ancient philosophy, harnessing the power of Claude 3.5 to create challenging, thought-provoking questions that push your understanding to new heights.

But TopicQA.AI isn't just about creating questions - it's about supercharging your learning journey. As you dive into your custom-crafted question bank, the intelligent interface adapts to your progress, allowing you to filter questions by difficulty, status, and tags. Struggling with a particularly tricky concept? Submit your open-ended answers and watch as Claude 3.5 provides instant, insightful feedback, explaining complex ideas with clarity and precision. With progress tracking across multiple subjects, you'll visually see your knowledge grow, motivating you to push further. Whether you're preparing for a crucial exam, upskilling for a career change, or simply satisfying your intellectual curiosity, TopicQA.AI turns the daunting task of learning into an engaging, personalized adventure that caters to your unique learning style and goals.

## Features

### Video Demo 
To see a demonstration of the user interface in action, check out this video:
[UI Demo Video](https://www.youtube.com/watch?v=gdCO83S5izI)

### Dashboard
![Dashboard](demo/dashboard.png)
The main dashboard provides an overview of your question banks and learning progress.

### Question Generation
![Question Generation](demo/gen_questions.png)
Easily generate new question banks by specifying topics and subtopics.

### Answer Evaluation
![Answer Evaluation](demo/dashboard_answers.png)
See answers to all the questions you are currently working on.

### Test Screen
![Test Screen](demo/test_screen.png)
Submit open-ended answers and receive instant, insightful feedback.

# Setup 

## LLM Functionality Setup

1. Create a `.env` file in the root directory.
2. Add the following variables to the `.env` file:
   ```
   ANTHROPIC_API_KEY=YOUR_API_KEY
   REACT_APP_ANTHROPIC_API_KEY=YOUR_API_KEY
   ```

## Generating Questions

### Option 1: Web Interface (Slower)
1. Navigate to "Generate Question Bank" in the top right of the UI.
2. Specify the topic, subtopics, and number of questions.
3. Watch the generations happen in real-time.

**Note:** This method is not multithreaded. For faster generation, use Option 2.

### Option 2: Python Script (Faster)
1. Install required packages:
   ```
   pip install -r requirements.txt
   ```
2. Update `topics` and `subtopics` in `generate_questions.py`.
3. Run the script:
   ```
   python generate_questions.py
   ```
4. Update the `QuestionBanks` constant at the top of `GitQuestionApp.js`.

## Running the Application

### Prerequisites
- Node.js and npm (verify with `node -v` and `npm -v`)

### Steps
1. Navigate to the `question-app` directory.
2. Install dependencies:
   ```
   npm install
   ```
3. Start the proxy server:
   ```
   npm run start:proxy
   ```
4. In a new terminal, start the frontend:
   ```
   npm run start
   ```
5. Access the application at `http://localhost:3000`.

## Overall Flow

```mermaid 

graph TD
    A[User Input] --> B{Generate or Use Existing?}
    B -->|Generate| C[Input Topic and Subtopics]
    C --> D[Generate Questions with Claude 3.5]
    D --> E[Save to Question Bank]
    B -->|Use Existing| F[Select Question Bank]
    E --> F
    F --> G[Display Questions]
    G --> H{User Action}
    H -->|Filter| I[Apply Filters]
    I --> G
    H -->|Answer| J[Submit Answer]
    J --> K[Evaluate with Claude 3.5]
    K --> L[Provide Feedback]
    L --> M[Update Progress]
    M --> G
    H -->|Change Bank| F
```

## Overall Logic

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant C as Claude 3.5 API
    participant DB as Database

    Note over U,DB: Question Bank Generation
    U->>F: Input topic and subtopics
    F->>B: Send generation request
    B->>C: Request question generation
    C->>B: Return generated questions
    B->>DB: Save questions to bank
    DB->>B: Confirm save
    B->>F: Update question bank list
    F->>U: Display new question bank

    Note over U,DB: Question Answering Flow
    U->>F: Select question bank
    F->>B: Request questions
    B->>DB: Fetch questions
    DB->>B: Return questions
    B->>F: Send questions
    F->>U: Display questions
    U->>F: Submit answer
    F->>B: Send answer for evaluation
    B->>C: Request answer evaluation
    C->>B: Return evaluation and feedback
    B->>F: Send feedback
    F->>U: Display feedback

    Note over U,DB: Progress Tracking
    U->>F: Request progress report
    F->>B: Fetch user progress
    B->>DB: Query user statistics
    DB->>B: Return progress data
    B->>F: Send progress report
    F->>U: Display progress dashboard

    Note over U,DB: Filtering and Searching
    U->>F: Apply filters (difficulty, tags, status)
    F->>B: Send filter criteria
    B->>DB: Query filtered questions
    DB->>B: Return filtered questions
    B->>F: Send filtered question list
    F->>U: Display filtered questions
```
