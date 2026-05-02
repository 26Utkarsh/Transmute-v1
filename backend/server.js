const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// FIXED: Your frontend files are in the root directory, so we go one level up from /backend
app.use(express.static(path.join(__dirname, '..')));

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err.message);
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large. Maximum size is 10MB.' });
    }
    res.status(500).json({ error: err.message || 'An unexpected error occurred.' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
