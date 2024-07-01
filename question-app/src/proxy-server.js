const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

app.post('/api/messages', async (req, res) => {
  try {
    console.log('Received request:', req.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('API key is missing');
    }
    console.log('API Key:', apiKey);
    const response = await axios.post('https://api.anthropic.com/v1/messages', req.body, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      }
    });
    console.log('Response from API:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Error calling external API:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    res.status(error.response ? error.response.status : 500).json({
      message: error.message,
      ...(error.response && { data: error.response.data })
    });
  }
});

app.post('/api/generate-questions', async (req, res) => {
  const { topic, subtopics, count } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key is missing' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const generateQuestion = async (subtopic) => {
    const prompt = `Generate an AP-style question about ${topic}, specifically on the subtopic of ${subtopic}. The question should be challenging and test deep understanding - the question and answer should be concise. Format the response as a JSON object with the following structure:
    {
      "Question": "The question text",
      "Answer": "A detailed answer or solution",
      "Difficulty": "Easy/Medium/Hard",
      "Tags": ["${topic}", "${subtopic}", "Additional relevant tag"]
    }`;

    try {
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1000,
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }]
      }, {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      });

      return JSON.parse(response.data.content[0].text);
    } catch (error) {
      console.error('Error generating question:', error);
      return null;
    }
  };

  const questions = [];
  for (let i = 0; i < count; i++) {
    const subtopic = subtopics[i % subtopics.length];
    const question = await generateQuestion(subtopic);
    if (question) {
      questions.push(question);
      res.write(JSON.stringify([question]) + '\n');
    }
  }

  res.end();
});

app.post('/api/save-questions', async (req, res) => {
  const { questions, filename } = req.body;
  const filePath = path.join(__dirname, '..', 'public', 'question_bank', filename);

  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(questions, null, 2));
    res.status(200).json({ message: 'Questions saved successfully' });
  } catch (error) {
    console.error('Error saving questions:', error);
    res.status(500).json({ error: 'Failed to save questions' });
  }
});

app.get('/api/question-banks', async (req, res) => {
  const questionBankPath = path.join(__dirname, '..', 'public', 'question_bank');
  try {
    const files = await fs.readdir(questionBankPath);
    const questionBanks = files
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file.replace(/_questions\.json$/, '').split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        file: `question_bank/${file}`
      }));
    res.json(questionBanks);
  } catch (error) {
    console.error('Error reading question banks:', error);
    res.status(500).json({ error: 'Failed to fetch question banks' });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});