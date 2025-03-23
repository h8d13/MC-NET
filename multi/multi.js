const { fork } = require('child_process');

function runScript(scriptPath) {
    return new Promise((resolve, reject) => {
        const process = fork(scriptPath);
        
        process.on('message', (message) => {
            console.log(`Message from ${scriptPath}:`, message);
        });
        
        process.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Script ${scriptPath} exited with code ${code}`));
            } else {
                resolve();
            }
        });
    });
}

async function runAllScripts() {
    try {
        await Promise.all([
            runScript('./chap-bot.js'),
            runScript('./defenda-bot.js'),
            runScript('./peta-bot.js'),
            runScript('./cool-bot.js'),
            runScript('./game-master.js')
        ]);
        console.log('All scripts completed');
    } catch (error) {
        console.error('Error running scripts:', error);
    }
}

runAllScripts();