const express = require('express');
const { spawn } = require('child_process');
const { validateCodeInput } = require('../middlewares/security');
const {executions} = require('./../config');
const { NodeVM } = require('vm2');
const phpInterpreter = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
 


let { restrictedPatterns } = require('./../middlewares/restricted') 

const restrictedPHPFunctions = [
    'exec',       // Executes a system command
    'shell_exec', // Executes a shell command
    'system',     // Executes an external program
    'passthru',   // Executes an external program and displays raw output
    'proc_open',  // Opens a process
    'popen',      // Opens a process file pointer
    'eval',       // Evaluates a string as PHP code
    'assert',     // Similar to eval(), evaluates a string as PHP code
    'create_function', // Dynamically creates anonymous functions (deprecated in PHP 7.2)
    'file_put_contents', // Writes to files
    'file_get_contents', // Reads files
    'fopen',      // Opens a file for reading or writing
    'fwrite',     // Writes data to a file
    'unlink',     // Deletes a file
    'rmdir',      // Deletes a directory
    'mkdir',      // Creates a directory
    'chmod',      // Changes file permissions
    'chown',      // Changes file ownership
    'curl_exec',  // Executes a cURL session (unsafe if not sandboxed)
    'fsockopen',  // Opens a network connection
    'socket_create', // Creates a socket
    'ftp_connect',   // Initiates an FTP connection
    'ftp_login',     // Logs into an FTP connection
    'mail',      // Sends an email (can be used for spam)
    'file',      // Reads the entire contents of a file
    'include',   // Includes and evaluates a specified file
    'require',   // Includes and evaluates a specified file
    'include_once', // Includes and evaluates a specified file only once
    'require_once', // Includes and evaluates a specified file only once
];

 
const restrictedPatternsInPHP = [
    /eval\(/g,            // Detects use of eval()
    /shell_exec\(/g,      // Detects use of shell_exec()
    /system\(/g,          // Detects use of system()
    /passthru\(/g,        // Detects use of passthru()
    /proc_open\(/g,       // Detects use of proc_open()
    /popen\(/g,           // Detects use of popen()
    /file_put_contents\(/g, // Detects file writing
    /file_get_contents\(/g, // Detects file reading
    /fopen\(/g,           // Detects opening a file
    /unlink\(/g,          // Detects deleting a file
    /curl_exec\(/g,       // Detects cURL execution
    /ftp_connect\(/g,     // Detects FTP connections
    /include\(/g,         // Detects file inclusion
    /require\(/g,         // Detects file inclusion via require
];

function isCodeRestricted(code) {

    // var newPatterns = [...restrictedPatternsInPHP, ...restrictedPatterns];
   
    // Check for restricted functions
    const hasRestrictedFunction = restrictedPHPFunctions.some(func => {
        const pattern = new RegExp(`\\b${func}\\b`, 'g'); // Match whole function names
        return pattern.test(code);
    });

    // Check for restricted patterns
    const hasRestrictedPattern = restrictedPatternsInPHP.some(pattern => pattern.test(code));

    // Return true if any restricted function or pattern is found
    return hasRestrictedFunction || hasRestrictedPattern;
}

 

phpInterpreter.post("/php", (req, res) => {

    var code = req.body.code;
    
    var response = {
        is_error: true,
        output: "",
        message: "Something went wrong"
    };

    // Check if the submitted code contains restricted patterns
    if (isCodeRestricted(code)) {
        response.message = "The module you import is currently unavailable but will be accessible shortly.";
        response.is_error = true;
        return res.send(response);
    }

    // create temp file if it doesn't exist
    const tempDir = path.resolve(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    // build file of temp name
    const filename = `code_${uuidv4()}.php`;
    const filepath = path.join(tempDir, filename);

    // create the file in temp root
    fs.writeFile(filepath, code, (err) => {
        if (err) {
            response.message = 'Internal server error.';
            response.is_error = true;
            return res.send(response);
        }

        // Spawn a child process to execute the code with 'node' as the command
        const execution = spawn( executions.php, [filepath], {
            cwd: tempDir,
            timeout: 1000,
            maxBuffer: 1024 * 1024, // 1MB buffer for stdout and stderr
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe']
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

        execution.on('close', (code, signal) => {
            fs.unlink(filepath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('Error deleting temp file:', unlinkErr);
                }
            });

            if (stderr) {
                response.is_error = true;
                response.output = stderr;
                response.message = "An error occurred while executing your code.";
            } else {
                response.output = stdout;
                response.is_error = false;
                response.message = "Your code was executed successfully.";
            }

            return res.send(response);
        });
        
    });
});



module.exports = { phpInterpreter };
 
