const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Apply security-related HTTP headers
const applySecurity = (app) => {
  app.use(helmet());

  // Enable CORS with specific configurations
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://yourdomain.com'); // Update with your domain
    res.header('Access-Control-Allow-Methods', 'POST');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  // Rate limiting to prevent abuse
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use(limiter);
};

// Validate and sanitize user input
const validateCodeInput = [
  body('language')
    .isString()
    .trim()
    .isIn(['python', 'javascript']) // Extend supported languages here
    .withMessage('Unsupported language.'),
  body('code')
    .isString()
    .trim()
    .isLength({ min: 1, max: 10000 }) // Limit code length
    .withMessage('Code must be between 1 and 10,000 characters.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = { applySecurity, validateCodeInput };
