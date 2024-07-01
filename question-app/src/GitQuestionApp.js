import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Home, Filter, BarChart2, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

const QuestionBanks = [
  { name: 'Mechanistic Interpretability', file: 'question_bank/mechanistic_interpretability_questions.json' },
  { name: 'Hodkin Huxley Model', file: 'question_bank/hodgkin_huxley_model_questions.json' },
  { name: 'GIT Version Control', file: 'question_bank/git_version_control_questions.json' },
  { name: 'Principles of Jainism', file: 'question_bank/principles_of_jainism_questions.json' },
];

const QuestionApp = () => {
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [filter, setFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [claudeFeedback, setClaudeFeedback] = useState("");
  const [isCorrect, setIsCorrect] = useState(null);
  const [selectedQuestionBank, setSelectedQuestionBank] = useState('');
  const [mode, setMode] = useState('browse');
  const [questionStatus, setQuestionStatus] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [analytics, setAnalytics] = useState({ correct: 0, incorrect: 0, partially_correct: 0, unattempted: 0 });
  const userAnswerRef = useRef(null);
  const [allTags, setAllTags] = useState([]);
  const [tagsCollapsed, setTagsCollapsed] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationTopic, setGenerationTopic] = useState('');
  const [generationSubtopics, setGenerationSubtopics] = useState('');
  const [generationCount, setGenerationCount] = useState(15);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [questionBanks, setQuestionBanks] = useState([]);

  const calculateAnalytics = useCallback(() => {
    const stats = Object.values(questionStatus).reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  
    return {
      correct: stats.correct || 0,
      partially_correct: stats.partially_correct || 0,
      incorrect: stats.incorrect || 0,
      unattempted: stats.unattempted || 0
    };
  }, [questionStatus]);


  const fetchQuestionBanks = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5001/api/question-banks');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const banks = await response.json();
      setQuestionBanks(banks);
      if (banks.length > 0 && !selectedQuestionBank) {
        setSelectedQuestionBank(banks[0].file);
      }
    } catch (error) {
      console.error('Error fetching question banks:', error);
      setError('Failed to fetch question banks');
    }
  }, [selectedQuestionBank]);

  useEffect(() => {
    fetchQuestionBanks();
  }, [fetchQuestionBanks]);

  const fetchQuestions = useCallback(async () => {
    if (!selectedQuestionBank) return;
    try {
      setIsLoading(true);
      const response = await fetch(`/${selectedQuestionBank}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const taggedData = data.map((q, index) => ({ ...q, id: index + 1 }));
      setQuestions(taggedData);
      setFilteredQuestions(taggedData);
      
      // Load question status
      const loadedStatus = {};
      taggedData.forEach(q => {
        const key = `${selectedQuestionBank}_question_${q.id}`;
        loadedStatus[q.id] = localStorage.getItem(key) || 'unattempted';
      });
      setQuestionStatus(prevStatus => ({...prevStatus, ...loadedStatus}));

      // Extract all unique tags
      const tags = [...new Set(taggedData.flatMap(q => q.Tags))];
      setAllTags(tags);
    } catch (e) {
      setError(`Failed to fetch questions: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedQuestionBank]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const filterQuestions = useCallback(() => {
    if (questions.length > 0) {
      setFilteredQuestions(
        questions.filter(q => {
          if (!q) return false;
          const lowerFilter = filter.toLowerCase();
          const matchesFilter = (
            (q.Question && q.Question.toLowerCase().includes(lowerFilter)) ||
            (q.Tags && q.Tags.some(tag => tag.toLowerCase().includes(lowerFilter))) ||
            (q.Difficulty && q.Difficulty.toLowerCase().includes(lowerFilter))
          );
          const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => q.Tags.includes(tag));
          const matchesStatus = statusFilter === 'all' || questionStatus[q.id] === statusFilter;
          const matchesDifficulty = difficultyFilter === 'all' || q.Difficulty === difficultyFilter;
          return matchesFilter && matchesTags && matchesStatus && matchesDifficulty;
        })
      );
    }
  }, [filter, questions, selectedTags, statusFilter, difficultyFilter, questionStatus]);

  useEffect(() => {
    filterQuestions();
  }, [filter, questions, selectedTags, statusFilter, difficultyFilter, filterQuestions]);

  useEffect(() => {
    setAnalytics(calculateAnalytics());
  }, [questionStatus, calculateAnalytics]);

  const tagColors = useMemo(() => {
    const colors = ['bg-red-200', 'bg-blue-200', 'bg-green-200', 'bg-yellow-200', 'bg-purple-200', 'bg-pink-200'];
    const tagColorMap = {};
    allTags.forEach((tag, index) => {
      tagColorMap[tag] = colors[index % colors.length];
    });
    return tagColorMap;
  }, [allTags]);

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < filteredQuestions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setUserAnswer("");
      setFeedback("");
      setClaudeFeedback("");
      setIsCorrect(null);
      if (userAnswerRef.current) {
        userAnswerRef.current.innerText = '';
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
      setUserAnswer("");
      setFeedback("");
      setClaudeFeedback("");
      setIsCorrect(null);
      if (userAnswerRef.current) {
        userAnswerRef.current.innerText = '';
      }
    }
  };

  const handleSubmitAnswer = async () => {
    const currentQuestion = filteredQuestions[currentQuestionIndex];
    setIsProcessing(true);

    try {
      const apiInput = {
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1024,
        messages: [
          { 
            role: "user", 
            content: `Question: ${currentQuestion.Question}\nCorrect Answer: ${currentQuestion.Answer}\nUser Answer: ${userAnswer}\n\nEvaluate the user's answer. Is it correct? Provide very concise feedback (a few sentences max) explaining why it's correct or incorrect, and offer suggestions for improvement if needed. At the end, include a single word 'CORRECT', 'PARTIALLY_CORRECT', or 'INCORRECT' to indicate the final evaluation.` 
          }
        ],
      };

      const response = await fetch('http://localhost:5001/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiInput)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      const claudeResponse = responseData.content[0].text;

      // Extract the evaluation result from Claude's response
      let evaluationResult;
      if (claudeResponse.includes('CORRECT') && !claudeResponse.includes('PARTIALLY_CORRECT') && !claudeResponse.includes('INCORRECT')) {
        evaluationResult = 'correct';
      } else if (claudeResponse.includes('PARTIALLY_CORRECT')) {
        evaluationResult = 'partially_correct';
      } else {
        evaluationResult = 'incorrect';
      }
      
      // Ensure the feedback reflects the correct evaluation
      setFeedback(
        evaluationResult === 'correct' ? "Correct!" : 
        evaluationResult === 'partially_correct' ? "Partially Correct" : 
        "Incorrect. Please review the detailed feedback for more information."
      );

      // Set Claude's feedback without the final evaluation word
      setClaudeFeedback(claudeResponse.replace(/\s*(CORRECT|PARTIALLY_CORRECT|INCORRECT)$/, '').trim());

      // Set the correct/incorrect status
      setIsCorrect(evaluationResult);

      // Set feedback based on Claude's evaluation
      setFeedback(
        evaluationResult === 'correct' ? "Correct!" : 
        evaluationResult === 'partially_correct' ? "Partially Correct" : 
        "Incorrect. See detailed feedback for more information."
      );
      
      setQuestionStatus(prev => ({
        ...prev,
        [currentQuestion.id]: evaluationResult
      }));
      const key = `${selectedQuestionBank}_question_${currentQuestion.id}`;
      localStorage.setItem(key, evaluationResult);
    } catch (error) {
      console.error("Error calling Claude API:", error);
      setFeedback("An error occurred while evaluating your answer. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderTags = useCallback((tags) => {
    return tags.map((tag, index) => (
      <span 
        key={index} 
        className={`inline-block ${tagColors[tag]} rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2 cursor-pointer`}
        onClick={() => handleTagClick(tag)}
      >
        {tag}
      </span>
    ));
  }, [tagColors]);

  const handleTagClick = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleQuestionBankChange = (e) => {
    setSelectedQuestionBank(e.target.value);
    setCurrentQuestionIndex(0);
    setUserAnswer("");
    setFeedback("");
    setClaudeFeedback("");
    setIsCorrect(null);
    setFilter("");
    setSelectedTags([]);
    setMode('browse');
  };

  const handleUserAnswerChange = () => {
    if (userAnswerRef.current) {
      setUserAnswer(userAnswerRef.current.innerText);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'correct':
        return 'bg-green-100';
      case 'partially_correct':
        return 'bg-yellow-100';
      case 'incorrect':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  const handleCardClick = (index) => {
    setCurrentQuestionIndex(index);
    setUserAnswer("");
    setFeedback("");
    setClaudeFeedback("");
    setIsCorrect(null);
    setMode('learn');
  };

  const handleStatusOverride = (questionId, newStatus) => {
    setQuestionStatus(prev => {
      const updatedStatus = {
        ...prev,
        [questionId]: newStatus
      };
      return updatedStatus;
    });
    const key = `${selectedQuestionBank}_question_${questionId}`;
    localStorage.setItem(key, newStatus);
  };
  
  const handleGenerateQuestions = async () => {
    setGeneratingQuestions(true);
    setGenerationProgress(0);
    setGeneratedQuestions([]);

    try {
      const response = await fetch('http://localhost:5001/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: generationTopic,
          subtopics: generationSubtopics.split(',').map(s => s.trim()),
          count: generationCount
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const newQuestions = JSON.parse(chunk);
        setGeneratedQuestions(prev => [...prev, ...newQuestions]);
        setGenerationProgress((prev) => prev + (100 / generationCount));
      }

      // Save the generated questions to a new file
      const newBankName = `${generationTopic.toLowerCase().replace(/\s+/g, '_')}_questions.json`;
      const saveResponse = await fetch('http://localhost:5001/api/save-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questions: generatedQuestions,
          filename: newBankName
        })
      });

      if (!saveResponse.ok) {
        throw new Error(`HTTP error! status: ${saveResponse.status}`);
      }

      // Refresh the question banks list
      await fetchQuestionBanks();

      // Set the newly created question bank as the selected one
      setSelectedQuestionBank(`question_bank/${newBankName}`);

      setMode('browse');
    } catch (error) {
      console.error("Error generating questions:", error);
      setError("An error occurred while generating questions. Please try again.");
    } finally {
      setGeneratingQuestions(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading questions...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-semibold text-gray-900">TopicQA.AI</span>
            </div>
            <div className="flex items-center space-x-4">
              <select
                onChange={handleQuestionBankChange}
                value={selectedQuestionBank}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                {QuestionBanks.map((bank) => (
                  <option key={bank.file} value={bank.file}>
                    {bank.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setMode(mode === 'generate' ? 'browse' : 'generate')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {mode === 'generate' ? 'Back to Browse' : 'Generate Question Bank'}
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {mode === 'browse' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Analytics</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <AnalyticCard title="Correct" value={analytics.correct} icon={<CheckCircle className="h-5 w-5 text-green-500" />} />
                <AnalyticCard title="Partially Correct" value={analytics.partially_correct} icon={<AlertCircle className="h-5 w-5 text-yellow-500" />} />
                <AnalyticCard title="Incorrect" value={analytics.incorrect} icon={<XCircle className="h-5 w-5 text-red-500" />} />
                <AnalyticCard title="Unattempted" value={analytics.unattempted} icon={<BarChart2 className="h-5 w-5 text-gray-500" />} />
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Questions</h2>
                <button
                  onClick={() => setShowAnswers(!showAnswers)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {showAnswers ? 'Hide Answers' : 'Show Answers'}
                </button>
              </div>
              <div className="mb-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <div className="flex-1">
                  <label htmlFor="filter" className="sr-only">Filter questions</label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Filter className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="filter"
                      id="filter"
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                      placeholder="Filter questions..."
                      value={filter}
                      onChange={handleFilterChange}
                    />
                  </div>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Statuses</option>
                  <option value="correct">Correct</option>
                  <option value="partially_correct">Partially Correct</option>
                  <option value="incorrect">Incorrect</option>
                  <option value="unattempted">Unattempted</option>
                </select>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by Tags:</h3>
                <div className="flex items-center mb-2">
                  <button
                    onClick={() => setTagsCollapsed(!tagsCollapsed)}
                    className="inline-flex items-center px-2 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {tagsCollapsed ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronUp className="h-4 w-4 mr-1" />}
                    {tagsCollapsed ? 'Expand Tags' : 'Collapse Tags'}
                  </button>
                </div>
                {!tagsCollapsed && (
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <span
                        key={tag}
                        onClick={() => handleTagClick(tag)}
                        className={`cursor-pointer px-2 py-1 rounded-full text-sm ${
                          selectedTags.includes(tag)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {filteredQuestions.map((q, index) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    showAnswer={showAnswers}
                    status={questionStatus[q.id]}
                    onClick={() => handleCardClick(index)}
                    onStatusChange={(newStatus) => handleStatusOverride(q.id, newStatus)}
                    renderTags={renderTags}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {mode === 'learn' && filteredQuestions.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Question {currentQuestionIndex + 1} of {filteredQuestions.length}
              </h3>
              <button
                onClick={() => setMode('browse')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Home className="mr-2 h-5 w-5" />
                Back to Home
              </button>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div className="bg-indigo-600 h-2.5 rounded-full" style={{width: `${((currentQuestionIndex + 1) / filteredQuestions.length) * 100}%`}}></div>
            </div>
            <p className="text-gray-700 mb-4">{filteredQuestions[currentQuestionIndex].Question}</p>
            <div
              ref={userAnswerRef}
              contentEditable
              onInput={handleUserAnswerChange}
              className="w-full p-4 border border-gray-300 rounded-md mb-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              style={{ whiteSpace: 'pre-wrap' }}
            />
            <div className="flex justify-between">
              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <ChevronLeft className="mr-2 h-5 w-5" />
                Previous
              </button>
              <button
                onClick={handleSubmitAnswer}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Submit Answer
              </button>
              <button
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex === filteredQuestions.length - 1}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                Next
                <ChevronRight className="ml-2 h-5 w-5" />
              </button>
            </div>
            {isCorrect !== null && (
              <div className={`mt-4 p-4 rounded-md ${
                isCorrect === 'correct' ? 'bg-green-50 text-green-800' : 
                isCorrect === 'partially_correct' ? 'bg-yellow-50 text-yellow-800' : 
                'bg-red-50 text-red-800'
              }`}>
                <h4 className="text-sm font-medium mb-2">Result:</h4>
                <p>{feedback}</p>
              </div>
            )}
            {claudeFeedback && (
              <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-md">
                <h4 className="text-sm font-medium mb-2">Detailed Feedback:</h4>
                <p>{claudeFeedback}</p>
              </div>
            )}
          </div>
        )}

        {mode === 'generate' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Generate Question Bank</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700">Topic</label>
                <input
                  type="text"
                  id="topic"
                  value={generationTopic}
                  onChange={(e) => setGenerationTopic(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="subtopics" className="block text-sm font-medium text-gray-700">Subtopics (comma-separated)</label>
                <input
                  type="text"
                  id="subtopics"
                  value={generationSubtopics}
                  onChange={(e) => setGenerationSubtopics(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="count" className="block text-sm font-medium text-gray-700">Number of Questions</label>
                <input
                  type="number"
                  id="count"
                  value={generationCount}
                  onChange={(e) => setGenerationCount(parseInt(e.target.value))}
                  min="1"
                  max="50"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <button
                onClick={handleGenerateQuestions}
                disabled={generatingQuestions}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {generatingQuestions ? 'Generating...' : 'Generate Questions'}
              </button>              {generatingQuestions && (
                <div className="mt-4">
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">
                          Progress
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-indigo-600">
                          {Math.round(generationProgress)}%
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200">
                      <div style={{ width: `${generationProgress}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {generatedQuestions.length > 0 && (
              <div className="mt-8">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Generated Questions</h4>
                <div className="space-y-4">
                  {generatedQuestions.map((q, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-md">
                      <h5 className="font-medium text-gray-900">{q.Question}</h5>
                      <p className="text-sm text-gray-500 mt-2">Answer: {q.Answer}</p>
                      <p className="text-sm text-gray-500">Difficulty: {q.Difficulty}</p>
                      <div className="mt-2">
                        {q.Tags.map((tag, tagIndex) => (
                          <span key={tagIndex} className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {isProcessing && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-4 text-gray-700">Processing your answer...</p>
          </div>
        </div>
      )}
    </div>
  );
};

const AnalyticCard = ({ title, value, icon }) => (
  <div className="bg-white overflow-hidden shadow rounded-lg">
    <div className="p-5">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="text-lg font-medium text-gray-900">{value}</dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
);

const QuestionCard = ({ question, showAnswer, status, onClick, onStatusChange, renderTags }) => {
  const [localStatus, setLocalStatus] = useState(status);

  const handleStatusChange = (newStatus) => {
    setLocalStatus(newStatus);
  };

  const confirmStatusChange = (e) => {
    e.stopPropagation();
    onStatusChange(localStatus);
  };

  return (
    <div 
      className={`bg-white overflow-hidden shadow rounded-lg transition duration-150 ease-in-out ${
        status === 'correct' ? 'border-l-4 border-green-500' :
        status === 'partially_correct' ? 'border-l-4 border-yellow-500' :
        status === 'incorrect' ? 'border-l-4 border-red-500' :
        'border-l-4 border-gray-200'
      } hover:shadow-md`}
    >
      <div className="px-4 py-5 sm:p-6" onClick={onClick}>
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
          {question.id}. {question.Question}
        </h3>
        {showAnswer && (
          <p className="mt-2 max-w-xl text-sm text-gray-500">
            Answer: {question.Answer}
          </p>
        )}
        <p className="mt-1 max-w-xl text-sm text-gray-500">
          Difficulty: {question.Difficulty}
        </p>
        <div className="mt-2">{renderTags(question.Tags)}</div>
      </div>
      <div className="bg-gray-50 px-4 py-4 sm:px-6">
        <label htmlFor={`status-${question.id}`} className="block text-sm font-medium text-gray-700 mb-2">
          Update Question Status
        </label>
        <div className="flex items-center space-x-2">
          <select
            id={`status-${question.id}`}
            value={localStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            style={{ minHeight: '44px' }}
          >
            <option value="unattempted">Unattempted</option>
            <option value="correct">Correct</option>
            <option value="partially_correct">Partially Correct</option>
            <option value="incorrect">Incorrect</option>
          </select>
          <button
            onClick={confirmStatusChange}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            style={{ minHeight: '44px' }}
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionApp;

// Add these styles to your CSS or use a CSS-in-JS solution
const globalStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border-left-color: #09f;
    animation: spin 1s ease infinite;
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }
`;

// You can add this style to your document or use a CSS-in-JS solution
const style = document.createElement('style');
style.textContent = globalStyles;
document.head.appendChild(style);