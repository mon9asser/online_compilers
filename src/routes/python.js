const express = require('express');
const { spawn } = require('child_process');
const { validateCodeInput } = require('../middlewares/security');
const { NodeVM } = require('vm2');
const pythonCompiler = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
 

let { restrictedPatterns } = require('./../middlewares/restricted') 

// const restrictedModules =  ['fs', 'express', 'vm2', 'child_process', 'child_process.promises', 'os', 'process']
 
const restrictedModules = [
    'os', 
    'sys', 
    'subprocess', 
    'shutil', 
    'socket', 
    'multiprocessing',
    'threading', 
    'signal', 
    'ctypes', 
    'inspect', 
    'http', 
    'requests',
    'ftplib', 
    'smtplib', 
    'poplib', 
    'resource', 
    'eval', 
    'exec', 
    'open'
];

function isCodeRestricted(code) {
    // Check for restricted modules
    const hasRestrictedModule = restrictedModules.some(module => {
        const requirePattern = new RegExp(`require\\(['"]${module}['"]\\)`);
        const importPattern = new RegExp(`import.*['"]${module}['"]`);
        return requirePattern.test(code) || importPattern.test(code);
    });

    // Check for restricted patterns
    const hasRestrictedPattern = restrictedPatterns.some(pattern => pattern.test(code));

    // Return true if any restricted module or pattern is found
    return hasRestrictedModule || hasRestrictedPattern;
}

 
 

pythonCompiler.post("/python", (req, res) => {

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
    const filename = `code_${uuidv4()}.py`;
    const filepath = path.join(tempDir, filename);

    // create the file in temp root
    fs.writeFile(filepath, code, (err) => {
        if (err) {
            response.message = 'Internal server error.';
            response.is_error = true;
            return res.send(response);
        }

        // Spawn a child process to execute the code with 'node' as the command
        const execution = spawn('python3', [filepath], {
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



module.exports = { pythonCompiler };
 
