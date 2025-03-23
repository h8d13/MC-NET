const mineflayer = require('mineflayer')
const Vec3 = require('vec3')
const { pathfinder, goals } = require('mineflayer-pathfinder')

const config = {
    collectibleBlocks: [
        {
            type: 'log',
            maxDistance: 312,
            priority: 1
        },
        {
            type: 'dirt',
            maxDistance: 16,
            priority: 2
        }
    ]
};

// Task status tracker
let isTaskInProgress = false;

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

const nn = new NeuralNetwork(6, 16, 7) 

// State
function getState() {
    if (!bot.entity) return Array(6).fill(0)
    
    const nearestEntity = bot.nearestEntity()
    const nearestBlock = bot.findBlock({
        matching: block => block.name.includes('log') || block.name.includes('dirt'),
        maxDistance: 256
    })

    return [
        bot.health ? bot.health / 20 : 0,
        bot.oxygenLevel ? bot.oxygenLevel / 20 : 1,
        bot.entity.position.y / 100,
        nearestEntity ? 1 - (bot.entity.position.distanceTo(nearestEntity.position) / 16) : 0,
        nearestBlock ? 1 - (bot.entity.position.distanceTo(nearestBlock.position) / 16) : 0,
        bot.time.timeOfDay / 24000,
    ]
}

// Survival tasks
async function survivalTasks() {
    if (isTaskInProgress) return;
    
    try {
        isTaskInProgress = true;
        await new Promise(resolve => setTimeout(resolve, 500));

        // Sort blocks by priority
        for (const blockConfig of config.collectibleBlocks) {
            const block = bot.findBlock({
                matching: block => block.name.includes(blockConfig.type),
                maxDistance: blockConfig.maxDistance
            })

            if (block) {
                await bot.pathfinder.goto(new goals.GoalBlock(block.position.x, block.position.y, block.position.z))
                await bot.dig(block)
                console.log(`Collected ${blockConfig.type}`)
            }
        }
        
    } catch (err) {
        console.log('Survival task error:', err.message)
    } finally {
        isTaskInProgress = false;
    }
}

async function collectionTasks() {
    if (isTaskInProgress) return;
    
    try {
        isTaskInProgress = true;

        const nearestItem = bot.nearestEntity(entity => {
            return entity.name === 'item' && entity.isValid // Check if item is still valid
        })
        
        if (nearestItem) {
            const distance = bot.entity.position.distanceTo(nearestItem.position)
            
            if (distance < 4) {
                const goal = new goals.GoalNear(
                    nearestItem.position.x,
                    nearestItem.position.y,
                    nearestItem.position.z,
                    1 // Reduce collection radius to 1 block
                )
                
                try {
                    // Add timeout to prevent getting stuck
                    const timeout = setTimeout(() => {
                        isTaskInProgress = false;
                    }, 5000);

                    // Check if item still exists before moving
                    if (nearestItem.isValid) {
                        await bot.pathfinder.goto(goal)
                        // Double check item still exists after reaching location
                        if (nearestItem.isValid) {
                            await bot.lookAt(nearestItem.position)
                        }
                    }

                    clearTimeout(timeout)
                    console.log('Moving to collect item:', nearestItem.name)
                } catch (err) {
                    console.log('Pathfinding error:', err.message)
                    isTaskInProgress = false // Ensure we reset the flag on error
                }
            }
        }
        
    } catch (err) {
        console.log('Collection task error:', err.message)
    } finally {
        isTaskInProgress = false;
    }
}

// Enhanced action system
async function takeAction(outputs) {
  const threshold = 0.3

  const controls = {
      forward: outputs[0] > threshold,
      back: outputs[1] > threshold,
      left: outputs[2] > threshold,
      right: outputs[3] > threshold,
      jump: outputs[4] > threshold,
      sneak: outputs[5] > threshold,
      sprint: outputs[6] > threshold  
  }

  Object.entries(controls).forEach(([action, state]) => {
      try {
          bot.setControlState(action, state)
      } catch (err) {
          console.log(`Control error (${action}):`, err.message)
      }
  })

  if (Math.random() < 0.01) {
      bot.look(Math.random() * Math.PI * 2, Math.random() * Math.PI - Math.PI/2)
  }

  if (Math.random() < 0.3 && !isTaskInProgress) {  
      await survivalTasks()
  }
  if (Math.random() < 0.1 && !isTaskInProgress) {
    await collectionTasks()
}
}

// Initialize bot behavior
bot.once('spawn', () => {
    console.log('Bot spawned, initializing behaviors...')

    // Day/night cycle handling
    // bot.on('time', () => {
       // if (bot.time.timeOfDay > 13000) {
            //console.log('Night time Actions')

    // Start main loop
    setInterval(async () => {
        try {
            const state = getState()
            const outputs = nn.forward(state)
            await takeAction(outputs)
            
            const reward = (
              ((bot.health !== undefined && bot.health !== null) ? bot.health : 0) / 20 +
              (bot.entity && bot.entity.position && bot.entity.position.y < 60 ? 0.5 : 0) +
              ((bot.inventory && bot.inventory.items()) ? bot.inventory.items().length : 0) / 36
          )
            
            nn.learn(state, reward)
            //console.log('State:', state)
            //console.log('Reward:', reward)
        } catch (err) {
            console.log('Main loop error:', err.message)
        }
    }, 450)
})

// Track Collections
bot.on('playerCollect', (collector, collected) => {
    if (collector === bot.entity) {
        const item = collected.getDroppedItem();
        const blockType = config.collectibleBlocks.find(block => 
            item.name.includes(block.type));
        if (blockType) {
            console.log(`${blockType.type} collected`);
        }
    }
});

let lastHealth = 20
bot.on('health', () => {
    if (bot.health < lastHealth) {
        const damageTaken = lastHealth - bot.health
        const punishment = -damageTaken  // Direct damage to negative punishment conversion
        
        console.log(`Bot took ${damageTaken} damage! Health dropped from ${lastHealth} to ${bot.health}`)
        console.log(`Applying punishment of ${punishment}`)
        
        const state = getState()
        nn.learn(state, punishment)
    }
    lastHealth = bot.health
})

bot.on('death', () => {
    console.log('Bot died, learning from mistake')
    const state = getState()
    nn.learn(state, -1)
})

bot.on('move', () => {
    //console.log('Position:', bot.entity.position)
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


bot.on('chat', (username, message) => {
    if (message === '!drop') {
        dropInventory()
    }
})

async function dropInventory() {
    try {
        const items = bot.inventory.items()
        if (items.length === 0) {
            bot.chat("My inventory is empty!")
            return
        }
        
        // Drop each item
        for (const item of items) {
            await bot.tossStack(item)
        }
        
        bot.chat("Dropped all items!")
    } catch (err) {
        console.log('Error dropping inventory:', err)
        bot.chat("Error dropping items!")
    }
}