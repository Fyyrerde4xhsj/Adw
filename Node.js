const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Replace with your actual Google YouTube API key
const API_KEY = 'AIzaSyA1ReMCRRpSnzW8DYlWfQE4j52N0wd6hx4';

app.use(express.static('public')); // Serve frontend files if using separate folder

app.get('/api/search', async (req, res) => {
  const query = req.query.query || '';
  const lang = req.query.lang || 'en';

  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  // Construct YouTube API search URL
  const apiUrl = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&q=${encodeURIComponent(query + ' ' + lang)}&part=snippet&type=video&maxResults=10&relevanceLanguage=${lang}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'YouTube API error' });
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
