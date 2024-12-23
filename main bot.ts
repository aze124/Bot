import noblox from 'noblox.js'
import { config } from '../config/config'
import { sendDiscordNotification } from './discord'
import { updateInventory } from './api'
import { Trade } from './types'

class TradeBot {
  private status = {
    isConnected: false,
    lastPing: new Date(),
    currentServer: ''
  }

  async initialize() {
    try {
      await noblox.setCookie(config.ROBLOX_COOKIE)
      const currentUser = await noblox.getCurrentUser()
      
      this.status.isConnected = true
      await sendDiscordNotification(`Bot initialized as ${currentUser.UserName}`)
      
      this.startHeartbeat()
      this.handleTrades()
    } catch (error) {
      await sendDiscordNotification('Failed to initialize bot', error)
      throw error
    }
  }

  private startHeartbeat() {
    setInterval(async () => {
      try {
        await noblox.getCurrentUser()
        this.status.lastPing = new Date()
      } catch (error) {
        this.status.isConnected = false
        await this.reconnect()
      }
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  private async reconnect() {
    try {
      await this.initialize()
      await sendDiscordNotification('Bot reconnected successfully')
    } catch (error) {
      await sendDiscordNotification('Failed to reconnect', error)
    }
  }

  private async handleTrades() {
    // Monitor incoming trades
    noblox.onTradeRequest(async (trade) => {
      try {
        const tradeInfo: Trade = {
          id: trade.id.toString(),
          userId: trade.user.id,
          username: trade.user.name,
          items: await this.getTradeItems(trade.id)
        }

        await updateInventory(tradeInfo)
        await sendDiscordNotification(`Trade completed with ${trade.user.name}`)
      } catch (error) {
        await sendDiscordNotification(`Trade failed with ${trade.user.name}`, error)
      }
    })
  }

  private async getTradeItems(tradeId: number) {
    const trade = await noblox.getTrade(tradeId)
    return trade.offers[0].items.map(item => ({
      name: item.name,
      value: item.recentAveragePrice || 0,
      assetId: item.assetId
    }))
  }
}

const bot = new TradeBot()
bot.initialize().catch(console.error)
