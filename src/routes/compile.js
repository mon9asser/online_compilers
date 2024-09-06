const express = require('express');
const { spawn } = require('child_process');
const { validateCodeInput } = require('../middlewares/security');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Create a temporary directory if it doesn't exist
const tempDir = path.resolve(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Supported languages configuration
const languages = {
  python: { ext: 'py', exec: 'python3' },
  javascript: { ext: 'js', exec: 'node' },
  // Add more languages as needed
};

// Maximum execution time in milliseconds
const EXECUTION_TIMEOUT = 10000; // process.env.TIMEOUT || 5000; // 5 seconds

router.post('/compile', validateCodeInput, (req, res) => {
  const { language, code } = req.body;

  // Check if the language is supported
  if (!languages[language]) {
    return res.status(400).json({ error: 'Unsupported language.' });
  }

  const langConfig = languages[language];
  const filename = `code_${uuidv4()}.${langConfig.ext}`;
  const filepath = path.resolve(tempDir, filename);


  // Write the code to a temporary file
  fs.writeFile(filepath, code, (err) => {
    if (err) {
      console.error('Error writing code to file:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
    
    console.log('File created at:', filepath);
    
    // Ensure file exists before executing
    if (!fs.existsSync(filepath)) {
      console.error('File not found:', filepath);
      return res.status(500).json({ error: 'File not found.' });
    }
    

    // Spawn a child process to execute the code
    const execution = spawn(langConfig.exec, [filepath], {
      cwd: tempDir,
      timeout: EXECUTION_TIMEOUT,
      maxBuffer: 1024 * 1024, // 1MB buffer for stdout and stderr
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
  
    let stdout = '';
    let stderr = '';

    // Capture stdout
    execution.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    // Capture stderr
    execution.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    
    // Handle process exit
    execution.on('close', (code, signal) => {
        
      // Delete the temporary file after execution
      fs.unlink(filepath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting temp file:', unlinkErr);
        }
      });

      if (signal === 'SIGTERM') {
        return res.status(400).json({ error: 'Execution timed out.' });
      }

      if (code !== 0) {
        return res.status(400).json({ error: stderr || 'Error during execution.' });
      }

      res.json({ output: stdout });
    });
 
    

    // Handle execution errors
    execution.on('error', (execErr) => {
        
      
      res.status(500).json({ error: 'Error executing code.' }); 
      
      // Ensure the temporary file is deleted
      fs.unlink(filepath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting temp file:', unlinkErr);
        }
      });

    });
  });
});

module.exports = router;
