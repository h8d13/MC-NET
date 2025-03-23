const mineflayer = require('mineflayer')

const bot = mineflayer.createBot({
    host: 'localhost',
    port: 12345,
    username: 'GameMaster',
    version: '1.21.1'
})

bot.once('spawn', () => {
    console.log('Bot spawned, initializing behaviors...')
    bot.chat('/gamemode creative');
})

// Add chat command handler
bot.on('chat', (username, message) => {
    if (message === '!home') {

        // Then teleport everyone to GameMaster
        bot.chat('/tp @a GameMaster');
        
        bot.chat('Everyone has been teleported to GameMaster!');
    }
});


let hasNightTeleported = false; // Add flag to track if night actions
// Day/night cycle handling
bot.on('time', () => {
    if (bot.time.timeOfDay > 13000 && !hasNightTeleported) {
        console.log('Night time Actions')
        bot.chat('/tp @a GameMaster');
        bot.chat('!drop')
        hasNightTeleported = true; // Set flag to true after teleporting
    } else if (bot.time.timeOfDay <= 13000) {
        hasNightTeleported = false; // Reset flag during day time
    }
});