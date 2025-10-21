import Elysia, { t } from "elysia"

// Store connected websocket clients
export const wsClients = new Set<any>()

export const websocket = new Elysia()
    .ws('/ws', {
        // Optional query parameters for client identification
        query: t.Object({
            id: t.Optional(t.String()),
            channel: t.Optional(t.String())
        }),
        // Handle incoming messages from clients
        body: t.Object({
            message: t.String(),
            type: t.Optional(t.String())
        }),
        open(ws) {
            // Add client to the set when they connect
            wsClients.add(ws)

            // Store client metadata
            const { id, channel } = ws.data.query
            ws.data.clientId = id || `client-${Date.now()}`
            ws.data.channel = channel || 'default'
            ws.data.connectedAt = new Date().toISOString()

            console.log('\n========================================')
            console.log('🔌 NEW WEBSOCKET CONNECTION')
            console.log('========================================')
            console.log(`Client ID: ${ws.data.clientId}`)
            console.log(`Channel: ${ws.data.channel}`)
            console.log(`Connected at: ${ws.data.connectedAt}`)
            console.log(`Total clients: ${wsClients.size}`)
            console.log(`IP: ${ws.data.request?.headers?.get('x-forwarded-for') || ws.data.request?.headers?.get('host') || 'unknown'}`)
            console.log('========================================\n')

            // Send welcome message
            ws.send({
                type: 'connection',
                message: 'Connected to pub/sub service',
                clientId: ws.data.clientId,
                channel: ws.data.channel,
                timestamp: Date.now()
            })
        },
        message(ws, { message, type }) {
            // Handle messages from clients
            const { clientId, channel } = ws.data

            console.log('\n----------------------------------------')
            console.log('📨 INCOMING MESSAGE FROM CLIENT')
            console.log('----------------------------------------')
            console.log(`From Client: ${clientId}`)
            console.log(`Channel: ${channel}`)
            console.log(`Message Type: ${type || 'default'}`)
            console.log(`Message: ${message}`)
            console.log(`Timestamp: ${new Date().toISOString()}`)
            console.log('----------------------------------------\n')

            // Echo back to sender with acknowledgment
            ws.send({
                type: type || 'ack',
                message: `Message received: ${message}`,
                clientId,
                channel,
                timestamp: Date.now()
            })

            // Optionally broadcast to other clients in the same channel
            if (type === 'broadcast') {
                const recipientCount = getChannelClientCount(channel) - 1
                console.log(`📡 Broadcasting to ${recipientCount} other client(s) in channel: ${channel}`)

                broadcastToChannel(channel, {
                    type: 'broadcast',
                    message,
                    fromClient: clientId,
                    channel,
                    timestamp: Date.now()
                }, ws)
            }
        },
        close(ws) {
            // Remove client from the set when they disconnect
            wsClients.delete(ws)

            const sessionDuration = ws.data.connectedAt
                ? Math.round((Date.now() - new Date(ws.data.connectedAt).getTime()) / 1000)
                : 0

            console.log('\n========================================')
            console.log('🔴 CLIENT DISCONNECTED')
            console.log('========================================')
            console.log(`Client ID: ${ws.data.clientId}`)
            console.log(`Channel: ${ws.data.channel}`)
            console.log(`Session Duration: ${sessionDuration} seconds`)
            console.log(`Remaining clients: ${wsClients.size}`)
            console.log('========================================\n')
        },
        error(ws, error) {
            console.error('\n❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌')
            console.error('WEBSOCKET ERROR')
            console.error('❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌')
            console.error(`Client ID: ${ws.data.clientId}`)
            console.error(`Error:`, error)
            console.error('❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌\n')
        }
    })

// Helper function to broadcast message to all connected clients
export function broadcastToAll(message: any) {
    let sentCount = 0
    let failedCount = 0

    wsClients.forEach((client: any) => {
        if (client.readyState === 1) { // Check if connection is open
            try {
                client.send(message)
                sentCount++
            } catch (error) {
                console.error(`Failed to send message to client ${client.data.clientId}:`, error)
                failedCount++
            }
        } else {
            failedCount++
        }
    })

    if (failedCount > 0) {
        console.log(`⚠️ Failed to send to ${failedCount} client(s)`)
    }
    console.log(`✅ Successfully sent to ${sentCount} client(s)`)
    return { sent: sentCount, failed: failedCount }
}

// Helper function to broadcast message to specific channel
export function broadcastToChannel(channel: string, message: any, exclude?: any) {
    let sentCount = 0
    let failedCount = 0

    wsClients.forEach((client: any) => {
        if (client.readyState === 1 && client.data.channel === channel && client !== exclude) {
            try {
                client.send(message)
                sentCount++
            } catch (error) {
                console.error(`Failed to send message to client ${client.data.clientId}:`, error)
                failedCount++
            }
        }
    })

    if (failedCount > 0) {
        console.log(`⚠️ Failed to send to ${failedCount} client(s) in channel ${channel}`)
    }
    if (sentCount > 0) {
        console.log(`✅ Successfully sent to ${sentCount} client(s) in channel ${channel}`)
    }
    return { sent: sentCount, failed: failedCount }
}

// Helper function to find client by ID
export function findClientById(clientId: string): any {
    return Array.from(wsClients).find((client: any) =>
        client.data.clientId === clientId
    )
}

// Helper function to get channel statistics
export function getChannelStats() {
    const channels: Record<string, number> = {}
    wsClients.forEach((client: any) => {
        const channel = client.data.channel || 'default'
        channels[channel] = (channels[channel] || 0) + 1
    })
    return channels
}

// Helper function to get client count for specific channel
export function getChannelClientCount(channel: string): number {
    return Array.from(wsClients).filter((client: any) =>
        client.data.channel === channel
    ).length
}
