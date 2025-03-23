const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')

const bot = mineflayer.createBot({
    host: 'localhost',
    port: 12345,
    username: 'Def',
    version: '1.21.1'
})

bot.loadPlugin(pathfinder)

const hostileMobs = [
    'zombie', 'skeleton', 'spider', 'creeper', 'enderman',
    'witch', 'slime', 'magma_cube', 'blaze', 'piglin',
    'drowned', 'pillager', 'vindicator', 'phantom'
]
let isDefending = false

bot.once('spawn', () => {
    const mcData = require('minecraft-data')(bot.version)
    const defaultMove = new Movements(bot, mcData)
    bot.pathfinder.setMovements(defaultMove)
    
    console.log('Bot spawned, starting defense mode')
    startDefending()
})

function startDefending() {
    if (isDefending) return
    
    setInterval(() => {
        try {
            // Find GameMaster specifically
            const gameMaster = bot.players['GameMaster']?.entity
            
            // If too far from GameMaster, move closer
            if (gameMaster && bot.entity.position.distanceTo(gameMaster.position) > 100) {
                bot.pathfinder.setGoal(new goals.GoalNear(
                    gameMaster.position.x,
                    gameMaster.position.y,
                    gameMaster.position.z,
                    50  // Stay within 
                ))
                return
            }

            const target = bot.nearestEntity(entity => {
                return hostileMobs.includes(entity.name) &&
                       entity.position.distanceTo(bot.entity.position) < 16
            })

            if (!target) {
                // If no target, move randomly but check GameMaster distance
                if (Math.random() < 0.1) {
                    if (gameMaster) {
                        // Random position within 40 blocks of GameMaster
                        const angle = Math.random() * 2 * Math.PI
                        const radius = Math.random() * 40
                        const x = gameMaster.position.x + Math.cos(angle) * radius
                        const z = gameMaster.position.z + Math.sin(angle) * radius
                        bot.pathfinder.setGoal(new goals.GoalXZ(x, z))
                    }
                }
                return
            }

            // Handle creepers differently - run away but stay near GameMaster
            if (target.name === 'creeper') {
                const angle = Math.atan2(
                    bot.entity.position.z - target.position.z,
                    bot.entity.position.x - target.position.x
                )
                const x = bot.entity.position.x + Math.cos(angle) * 10
                const z = bot.entity.position.z + Math.sin(angle) * 10
                
                // Check if new position would be too far from GameMaster
                if (gameMaster) {
                    const newPos = { x, y: bot.entity.position.y, z }
                    const distToGameMaster = Math.sqrt(
                        Math.pow(newPos.x - gameMaster.position.x, 2) +
                        Math.pow(newPos.z - gameMaster.position.z, 2)
                    )
                    if (distToGameMaster <= 50) {
                        bot.pathfinder.setGoal(new goals.GoalXZ(x, z))
                    }
                }
                return
            }

            // Keep extra distance from skeletons
            const distance = target.name === 'skeleton' ? 4 : 2
            bot.pathfinder.setGoal(new goals.GoalNear(
                target.position.x,
                target.position.y,
                target.position.z,
                distance
            ))
            
            if (target.position.distanceTo(bot.entity.position) < distance + 1) {
                bot.lookAt(target.position)
                bot.attack(target)
            }

        } catch (err) {
            console.log('Defense error:', err)
        }
    }, 500)

    isDefending = true
}

// Debug logging
bot.on('move', () => {
    const gameMaster = bot.players['GameMaster']?.entity
    if (gameMaster) {
        console.log(`Position: ${bot.entity.position}, Distance to GameMaster: ${bot.entity.position.distanceTo(gameMaster.position)}`)
    }
})

bot.on('error', err => console.log('Error:', err))