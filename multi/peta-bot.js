const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')

const bot = mineflayer.createBot({
    host: 'localhost',
    port: 12345,
    username: 'Peta',
    version: '1.21.1'
})

bot.loadPlugin(pathfinder)

const huntableMobs = ['cow', 'pig', 'sheep', 'chicken', 'rabbit', 'salmon', 'horses']
let isHunting = false

bot.once('spawn', () => {
    const mcData = require('minecraft-data')(bot.version)
    const defaultMove = new Movements(bot, mcData)
    bot.pathfinder.setMovements(defaultMove)
    
    console.log('Bot spawned, starting hunting behavior')
    startHunting()
})

function startHunting() {
    if (isHunting) return
    
    setInterval(() => {
        try {
            // Find Choppy specifically
            const choppy = bot.players['Choppy']?.entity
            
            // If too far from Choppy, move closer (increased from 100 to 200)
            if (choppy && bot.entity.position.distanceTo(choppy.position) > 200) {
                bot.pathfinder.setGoal(new goals.GoalNear(
                    choppy.position.x,
                    choppy.position.y,
                    choppy.position.z,
                    50  // Increased from 25 to 50
                ))
                return
            }

            const target = bot.nearestEntity(entity => {
                return huntableMobs.includes(entity.name) &&
                       entity.position.distanceTo(bot.entity.position) < 300 && // Increased from 256
                       (!choppy || entity.position.distanceTo(choppy.position) <= 200) // Increased from 100
            })

            if (!target) {
                // If no target, move randomly but stay near Choppy
                if (Math.random() < 0.1) {
                    if (choppy) {
                        // Random position within 100 blocks of Choppy (increased from 40)
                        const angle = Math.random() * 2 * Math.PI
                        const radius = Math.random() * 100
                        const x = choppy.position.x + Math.cos(angle) * radius
                        const z = choppy.position.z + Math.sin(angle) * radius
                        bot.pathfinder.setGoal(new goals.GoalXZ(x, z))
                    }
                }
                return
            }

            // Before moving to target, check if it would take us too far from Choppy
            if (choppy) {
                const distanceToTarget = target.position.distanceTo(choppy.position)
                if (distanceToTarget > 150) { // Increased from 45
                    return
                }
            }

            // Move to and attack target
            bot.pathfinder.setGoal(new goals.GoalNear(
                target.position.x,
                target.position.y,
                target.position.z,
                1
            ))
            
            if (target.position.distanceTo(bot.entity.position) < 3) {
                bot.lookAt(target.position)
                bot.attack(target)
            }

        } catch (err) {
            console.log('Hunting error:', err)
        }
    }, 500)

    isHunting = true
}

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

// Debug logging
bot.on('move', () => {
    const choppy = bot.players['Choppy']?.entity
    if (choppy) {
        console.log(`Position: ${bot.entity.position}, Distance to Choppy: ${bot.entity.position.distanceTo(choppy.position)}`)
    }
})

bot.on('error', err => console.log('Error:', err))