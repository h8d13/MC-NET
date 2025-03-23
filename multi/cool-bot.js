const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const Vec3 = require('vec3')


const bot = mineflayer.createBot({
    host: 'localhost',
    port: 12345,
    username: 'Cool',
    version: '1.21.1'
})

bot.loadPlugin(pathfinder)

let isCollecting = false
const FOLLOW_DISTANCE = 30
const ITEM_COLLECT_RANGE = 100

async function placeSapling() {
    try {
        // Find saplings in inventory
        const saplingItem = bot.inventory.items().find(item => item.name.endsWith('_sapling'))
        if (!saplingItem) return

        // Find grass or dirt block below bot
        const blockBelow = bot.blockAt(bot.entity.position.offset(0, -1, 0))
        if (blockBelow && (blockBelow.name === 'grass_block' || blockBelow.name === 'dirt')) {
            await bot.equip(saplingItem, 'hand')
            await bot.placeBlock(blockBelow, new Vec3(0, 1, 0))
            console.log('Placed sapling')
        }
    } catch (err) {
        console.log('Error placing sapling:', err)
    }
}

bot.once('spawn', () => {
    const mcData = require('minecraft-data')(bot.version)
    const defaultMove = new Movements(bot, mcData)
    bot.pathfinder.setMovements(defaultMove)
    
    console.log('Collector bot spawned, starting collection behavior')
    startCollecting()
})

function startCollecting() {
    if (isCollecting) return
    
    setInterval(async () => {
        try {
            const choppy = bot.players['Choppy']?.entity
            
            // Look for dropped items
            const items = Object.values(bot.entities).filter(entity => {
                return entity.name === 'item' && 
                       entity.position.distanceTo(bot.entity.position) < ITEM_COLLECT_RANGE &&
                       (!choppy || entity.position.distanceTo(choppy.position) < ITEM_COLLECT_RANGE)
            })

            // If we found items, go to the nearest one
            if (items.length > 0) {
                const nearestItem = items.reduce((nearest, current) => {
                    const nearestDist = nearest.position.distanceTo(bot.entity.position)
                    const currentDist = current.position.distanceTo(bot.entity.position)
                    return currentDist < nearestDist ? current : nearest
                }, items[0])

                console.log(`Moving to collect item at ${nearestItem.position}`)
                bot.pathfinder.setGoal(new goals.GoalNear(
                    nearestItem.position.x,
                    nearestItem.position.y,
                    nearestItem.position.z,
                    1
                ))
            } 
            // If no items and we have saplings, try to place them
            else if (bot.inventory.items().some(item => item.name.endsWith('_sapling'))) {
                await placeSapling()
            }
            // If no items and Choppy exists, stay near Choppy
            else if (choppy) {
                const distanceToChoppy = bot.entity.position.distanceTo(choppy.position)
                if (distanceToChoppy > FOLLOW_DISTANCE) {
                    bot.pathfinder.setGoal(new goals.GoalNear(
                        choppy.position.x,
                        choppy.position.y,
                        choppy.position.z,
                        FOLLOW_DISTANCE
                    ))
                }
            }

        } catch (err) {
            console.log('Collection error:', err)
        }
    }, 500)

    isCollecting = true
}

// Check inventory regularly for saplings
setInterval(async () => {
    await placeSapling()
}, 1000)

bot.on('physicsTick', () => {
    try {
        const items = Object.values(bot.entities).filter(entity => 
            entity.name === 'item' && 
            entity.position.distanceTo(bot.entity.position) < 2
        )
        
        if (items.length > 0) {
            const nearest = items[0]
            bot.lookAt(nearest.position)
            bot.setControlState('forward', true)
        } else {
            bot.setControlState('forward', false)
        }
    } catch (err) {
        console.log('Physics tick error:', err)
    }
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
        
        for (const item of items) {
            if (!item.name.endsWith('_sapling')) { // Don't drop saplings
                await bot.tossStack(item)
            }
        }
        
        bot.chat("Dropped all non-sapling items!")
    } catch (err) {
        console.log('Error dropping inventory:', err)
        bot.chat("Error dropping items!")
    }
}

bot.on('entitySpawn', (entity) => {
    if (entity.name === 'item') {
        console.log(`Item spawned at ${entity.position}`)
    }
})

bot.on('error', err => console.log('Error:', err))