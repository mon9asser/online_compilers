require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { applySecurity } = require('./src/middlewares/security');
const {javaScriptCompiler} = require('./src/routes/javascript');
const {pythonCompiler} = require('./src/routes/python');

const app = express();

// Parse JSON requests
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true })); // Add this to handle form-encoded data

// Apply security middleware
applySecurity(app);

// Use the compile route
app.use('/api/run', javaScriptCompiler);
app.use('/api/run', pythonCompiler);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// Start the server
const PORT = process.env.PORT || 6000;

app.listen(PORT, () => {
  console.log(`Online Compiler is running on port ${PORT}`);
});
