const mineflayer = require('mineflayer')
const Vec3 = require('vec3')
const { pathfinder, goals } = require('mineflayer-pathfinder')

// Configuration
const BUDDY_USERNAME = 'h8d13' // Change this to the username you want to follow
const FOLLOW_RANGE = 50 // How many blocks away the bot can be from buddy

class NeuralNetwork {
    constructor(inputSize, hiddenSize, outputSize) {
        this.weights1 = Array(inputSize).fill().map(() => 
            Array(hiddenSize).fill().map(() => Math.random() * 2 - 1))
        this.weights2 = Array(hiddenSize).fill().map(() => 
            Array(outputSize).fill().map(() => Math.random() * 2 - 1))
        this.learningRate = 0.1
    }

    sigmoid(x) {
        return 1 / (1 + Math.exp(-x))
    }

    forward(inputs) {
        const validInputs = inputs.map(i => Number(i) || 0)
        
        const hidden = validInputs.map((_, i) => 
            this.weights1[i].reduce((sum, w, j) => sum + w * validInputs[j], 0))
            .map(x => this.sigmoid(x))
        
        return hidden.map((_, i) => 
            this.weights2[i].reduce((sum, w, j) => sum + w * hidden[j], 0))
            .map(x => this.sigmoid(x))
    }

    learn(inputs, rewards) {
        const outputs = this.forward(inputs)
        for(let i = 0; i < this.weights1.length; i++) {
            for(let j = 0; j < this.weights1[i].length; j++) {
                this.weights1[i][j] += this.learningRate * rewards * inputs[i]
            }
        }
    }
}

const bot = mineflayer.createBot({
    host: 'localhost',
    port: 12345,
    username: 'Choppy',
    version: '1.21.1'
})

// Load plugins
bot.loadPlugin(pathfinder)

const nn = new NeuralNetwork(11, 16, 6) // Added one more input for buddy distance

function getState() {
    if (!bot.entity) return Array(11).fill(0)
    
    const nearestEntity = bot.nearestEntity()
    const nearestBlock = bot.findBlock({
        matching: block => block.name.includes('log') || block.name.includes('stone'),
        maxDistance: 4
    })
    
    const buddy = bot.players[BUDDY_USERNAME]
    const buddyDistance = buddy && buddy.entity ? 
        Math.min(1, Math.max(0, 1 - (bot.entity.position.distanceTo(buddy.entity.position) / 16))) : 
        0

    const state = [
        typeof bot.health === 'number' ? bot.health / 20 : 1,
        bot.food && typeof bot.food.foodLevel === 'number' ? bot.food.foodLevel / 20 : 1,
        typeof bot.oxygenLevel === 'number' ? bot.oxygenLevel / 20 : 1,
        bot.entity.position.y / 100,
        nearestEntity ? Math.min(1, Math.max(0, 1 - (bot.entity.position.distanceTo(nearestEntity.position) / 16))) : 0,
        nearestBlock ? Math.min(1, Math.max(0, 1 - (bot.entity.position.distanceTo(nearestBlock.position) / 16))) : 0,
        bot.inventory.items().length / 36,
        typeof bot.time.timeOfDay === 'number' ? (bot.time.timeOfDay % 24000) / 24000 : 0,
        typeof bot.game.difficulty === 'number' ? bot.game.difficulty / 3 : 1,
        typeof bot.experience.level === 'number' ? bot.experience.level / 30 : 0,
        buddyDistance // Added buddy distance to state
    ]

    return state.map(val => isNaN(val) ? 0 : val)
}

async function stayNearBuddy() {
    const buddy = bot.players[BUDDY_USERNAME]
    if (!buddy || !buddy.entity) return false

    const distance = bot.entity.position.distanceTo(buddy.entity.position)
    
    if (distance > FOLLOW_RANGE) {
        try {
            await bot.pathfinder.goto(new goals.GoalNear(
                buddy.entity.position.x,
                buddy.entity.position.y,
                buddy.entity.position.z,
                2
            ))
        } catch (err) {
            console.log('Following error:', err.message)
        }
        return true
    }
    return false
}

async function survivalTasks() {
    try {
        const tree = bot.findBlock({
            matching: block => block.name.includes('log'),
            maxDistance: 32
        })

        if (tree) {
            await bot.pathfinder.goto(new goals.GoalBlock(tree.position.x, tree.position.y, tree.position.z))
            await bot.dig(tree)
            console.log('Collected wood')
        }

    } catch (err) {
        console.log('Survival task error:', err.message)
    }
}

async function takeAction(outputs) {
    // Check buddy position first
    const isFollowing = await stayNearBuddy()
    
    // Only do other actions if not currently following buddy
    if (!isFollowing) {
        const threshold = 0.3
        const controls = {
            forward: outputs[0] > threshold,
            back: outputs[1] > threshold,
            left: outputs[2] > threshold,
            right: outputs[3] > threshold,
            jump: outputs[4] > threshold,
            sneak: outputs[5] > threshold
        }

        Object.entries(controls).forEach(([action, state]) => {
            try {
                bot.setControlState(action, state)
            } catch (err) {
                console.log(`Control error (${action}):`, err.message)
            }
        })

        if (Math.random() < 0.1) {
            bot.look(Math.random() * Math.PI * 2, Math.random() * Math.PI - Math.PI/2)
        }
    }

    if (Math.random() < 0.1) {
        await survivalTasks()
    }
}

bot.once('spawn', () => {
    console.log('Bot spawned, initializing behaviors...')
    console.log(`Following player: ${BUDDY_USERNAME}`)

    bot.on('time', () => {
        if (bot.time.timeOfDay > 13000) {
            console.log('Night time - seeking shelter')
            const blocks = bot.findBlocks({
                matching: block => block.name === 'dirt' || block.name === 'stone',
                maxDistance: 4,
                count: 10
            })
            if (blocks.length > 0) {
                const shelter = blocks[0]
                bot.pathfinder.goto(new goals.GoalBlock(shelter.x, shelter.y, shelter.z))
            }
        }
    })

    setInterval(async () => {
        try {
            const state = getState()
            const outputs = nn.forward(state)
            await takeAction(outputs)
            
            const health = typeof bot.health === 'number' ? bot.health / 20 : 1
            const food = bot.food && typeof bot.food.foodLevel === 'number' ? bot.food.foodLevel / 20 : 1
            const inventoryScore = bot.inventory.items().length / 36
            const heightPenalty = bot.entity.position.y < 60 ? 0.5 : 0
            
            // Add buddy distance to reward
            const buddy = bot.players[BUDDY_USERNAME]
            const buddyBonus = buddy && buddy.entity ? 
                Math.max(0, 1 - (bot.entity.position.distanceTo(buddy.entity.position) / FOLLOW_RANGE)) : 
                0
            
            const reward = health + food + inventoryScore - heightPenalty + buddyBonus
            const finalReward = isNaN(reward) ? 0 : Math.max(-1, Math.min(1, reward))
            
            nn.learn(state, finalReward)
            console.log('State:', state)
            console.log('Reward:', finalReward)
            console.log('Distance to buddy:', buddy && buddy.entity ? 
                bot.entity.position.distanceTo(buddy.entity.position).toFixed(2) : 'N/A')
        } catch (err) {
            console.log('Main loop error:', err.message)
        }
    }, 500)
})

bot.on('entityHurt', (entity) => {
    if (entity === bot.entity) {
        console.log('Bot took damage!')
        const state = getState()
        nn.learn(state, -0.5)
    }
})

bot.on('death', () => {
    console.log('Bot died, learning from mistake')
    const state = getState()
    nn.learn(state, -1)
})

bot.on('move', () => {
    const buddy = bot.players[BUDDY_USERNAME]
    if (buddy && buddy.entity) {
        console.log(`Position: ${bot.entity.position}, Distance to ${BUDDY_USERNAME}: ${
            bot.entity.position.distanceTo(buddy.entity.position).toFixed(2)
        }`)
    } else {
        console.log(`Position: ${bot.entity.position}, Buddy not found`)
    }
})

bot.on('error', (err) => {
    console.log('Bot error:', err.message)
})

bot.on('end', () => {
    console.log('Bot disconnected')
})

process.on('uncaughtException', (err) => {
    console.log('Uncaught exception:', err.message)
})