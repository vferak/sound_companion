import Elysia, { t } from "elysia"
import {
    wsClients,
    broadcastToAll,
    broadcastToChannel,
    findClientById,
    getChannelStats,
    getChannelClientCount
} from "./websocket"
import { jolandaDefinition } from "./jolanda-definition"
import { lakatosDefinition } from "./lakatos-definition"
import { myInstantsDefinition } from "./myInstants"
import { theChatWheelDefinition } from "./theChatWheel"

const packageJson = require("../package.json")

export const rest = new Elysia()
    // GET endpoint to retrieve app version
    .get('/api/version', () => ({
        version: packageJson.version
    }))
    // REST endpoint to send messages to all connected websocket clients
    .post('/send-message', async ({ body, request }) => {
        const startTime = Date.now()
        const requestId = `req-${startTime}-${Math.random().toString(36).substr(2, 9)}`

        console.log('\n🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀')
        console.log('📮 REST API: SEND MESSAGE')
        console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀')
        console.log(`Request ID: ${requestId}`)
        console.log(`Method: POST /send-message`)
        console.log(`IP: ${request.headers.get('x-forwarded-for') || request.headers.get('host') || 'unknown'}`)
        console.log(`User-Agent: ${request.headers.get('user-agent') || 'unknown'}`)
        console.log(`Content-Type: ${request.headers.get('content-type')}`)
        console.log(`Timestamp: ${new Date().toISOString()}`)
        console.log('----------------------------------------')
        console.log('📦 REQUEST BODY:')
        console.log(JSON.stringify(body, null, 2))
        console.log('----------------------------------------')

        const messageData = {
            type: body.type || 'server-message',
            message: body.message,
            channel: body.channel || 'default',
            timestamp: Date.now(),
            ...body.data, // Allow additional custom data
            ...(body.category && { category: body.category }),
            ...(body.filename && { filename: body.filename })
        }

        console.log('📤 MESSAGE DATA TO BROADCAST:')
        console.log(`Type: ${messageData.type}`)
        console.log(`Message: ${body.message}`)
        console.log(`Target Channel: ${body.channel || 'ALL CHANNELS'}`)
        if (body.category) console.log(`Category: ${body.category}`)
        if (body.filename) console.log(`Filename: ${body.filename}`)
        if (body.data) console.log(`Additional Data:`, body.data)
        console.log('----------------------------------------')

        // Broadcast to specific channel or all clients
        let recipientCount = 0
        let broadcastResult = { sent: 0, failed: 0 }

        if (body.channel) {
            recipientCount = getChannelClientCount(body.channel)
            console.log(`📡 Broadcasting to channel: "${body.channel}"`)
            console.log(`Recipients: ${recipientCount} client(s)`)
            broadcastResult = broadcastToChannel(body.channel, messageData)
        } else {
            recipientCount = wsClients.size
            console.log(`📡 Broadcasting to ALL channels`)
            console.log(`Recipients: ${recipientCount} client(s)`)
            broadcastResult = broadcastToAll(messageData)
        }

        const processingTime = Date.now() - startTime

        console.log('----------------------------------------')
        console.log('📊 BROADCAST RESULTS:')
        console.log(`✅ Successfully sent: ${broadcastResult.sent || recipientCount}`)
        console.log(`❌ Failed: ${broadcastResult.failed || 0}`)
        console.log(`⏱️ Processing Time: ${processingTime}ms`)
        console.log(`Timestamp: ${new Date(messageData.timestamp).toISOString()}`)
        console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀\n')

        return {
            success: true,
            message: 'Message sent to websocket clients',
            requestId,
            recipientCount,
            sent: broadcastResult.sent || recipientCount,
            failed: broadcastResult.failed || 0,
            timestamp: messageData.timestamp,
            processingTime: `${processingTime}ms`
        }
    }, {
        body: t.Object({
            message: t.String(),
            channel: t.Optional(t.String()),
            type: t.Optional(t.String()),
            category: t.Optional(t.String()),
            filename: t.Optional(t.String()),
            data: t.Optional(t.Any())
        })
    })
    // Endpoint to get connected clients info
    .get('/ws-clients', ({ request }) => {
        const startTime = Date.now()
        const requestId = `req-${startTime}-${Math.random().toString(36).substr(2, 9)}`

        console.log('\n📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊')
        console.log('📋 REST API: GET CLIENT STATUS')
        console.log('📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊')
        console.log(`Request ID: ${requestId}`)
        console.log(`Method: GET /ws-clients`)
        console.log(`IP: ${request.headers.get('x-forwarded-for') || request.headers.get('host') || 'unknown'}`)
        console.log(`User-Agent: ${request.headers.get('user-agent') || 'unknown'}`)
        console.log(`Timestamp: ${new Date().toISOString()}`)
        console.log('----------------------------------------')

        const clients = Array.from(wsClients).map((ws: any) => ({
            clientId: ws.data.clientId,
            channel: ws.data.channel,
            connectedAt: ws.data.connectedAt,
            isAlive: ws.readyState === 1
        }))

        const channelStats = getChannelStats()
        const activeClients = clients.filter(c => c.isAlive).length
        const processingTime = Date.now() - startTime

        console.log('📊 CLIENT STATISTICS:')
        console.log(`Total Clients: ${wsClients.size}`)
        console.log(`Active Clients: ${activeClients}`)
        console.log(`Inactive Clients: ${wsClients.size - activeClients}`)
        console.log('----------------------------------------')
        console.log('📡 CHANNEL DISTRIBUTION:')
        Object.entries(channelStats).forEach(([channel, count]) => {
            console.log(`  ${channel}: ${count} client(s)`)
        })
        console.log('----------------------------------------')
        console.log('👥 CLIENT DETAILS:')
        clients.forEach((client, index) => {
            console.log(`  [${index + 1}] ID: ${client.clientId}`)
            console.log(`      Channel: ${client.channel}`)
            console.log(`      Connected: ${client.connectedAt}`)
            console.log(`      Status: ${client.isAlive ? '🟢 Active' : '🔴 Inactive'}`)
        })
        console.log('----------------------------------------')
        console.log(`⏱️ Processing Time: ${processingTime}ms`)
        console.log('📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊📊\n')

        return {
            success: true,
            requestId,
            totalClients: wsClients.size,
            activeClients,
            clients,
            channels: channelStats,
            processingTime: `${processingTime}ms`
        }
    })
    // Endpoint to send message to specific client
    .post('/send-to-client/:clientId', async ({ params, body, request }) => {
        const startTime = Date.now()
        const requestId = `req-${startTime}-${Math.random().toString(36).substr(2, 9)}`

        console.log('\n💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬')
        console.log('📨 REST API: DIRECT MESSAGE')
        console.log('💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬')
        console.log(`Request ID: ${requestId}`)
        console.log(`Method: POST /send-to-client/${params.clientId}`)
        console.log(`IP: ${request.headers.get('x-forwarded-for') || request.headers.get('host') || 'unknown'}`)
        console.log(`User-Agent: ${request.headers.get('user-agent') || 'unknown'}`)
        console.log(`Content-Type: ${request.headers.get('content-type')}`)
        console.log(`Timestamp: ${new Date().toISOString()}`)
        console.log('----------------------------------------')
        console.log(`Target Client: ${params.clientId}`)
        console.log('📦 REQUEST BODY:')
        console.log(JSON.stringify(body, null, 2))
        console.log('----------------------------------------')

        const client = findClientById(params.clientId)

        if (!client) {
            const processingTime = Date.now() - startTime

            console.log('❌ RESULT: Client not found')
            console.log(`⏱️ Processing Time: ${processingTime}ms`)
            console.log('💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬\n')

            return {
                success: false,
                requestId,
                message: `Client ${params.clientId} not found`,
                processingTime: `${processingTime}ms`
            }
        }

        const messageData = {
            type: body.type || 'direct-message',
            message: body.message,
            timestamp: Date.now(),
            ...body.data
        }

        console.log('📤 MESSAGE DATA:')
        console.log(`Type: ${messageData.type}`)
        console.log(`Message: ${body.message}`)
        if (body.data) console.log(`Additional Data:`, body.data)
        console.log('----------------------------------------')

        try {
            client.send(messageData)
            const processingTime = Date.now() - startTime

            console.log('✅ RESULT: Message sent successfully')
            console.log(`Client Status: ${client.readyState === 1 ? '🟢 Connected' : '🔴 Disconnected'}`)
            console.log(`Client Channel: ${client.data.channel}`)
            console.log(`Client Connected At: ${client.data.connectedAt}`)
            console.log(`⏱️ Processing Time: ${processingTime}ms`)
            console.log('💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬\n')

            return {
                success: true,
                requestId,
                message: `Message sent to client ${params.clientId}`,
                timestamp: messageData.timestamp,
                processingTime: `${processingTime}ms`
            }
        } catch (error) {
            const processingTime = Date.now() - startTime

            console.error('❌ RESULT: Failed to send message')
            console.error(`Error:`, error)
            console.log(`⏱️ Processing Time: ${processingTime}ms`)
            console.log('💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬\n')

            return {
                success: false,
                requestId,
                message: `Failed to send message to client ${params.clientId}`,
                error: error instanceof Error ? error.message : String(error),
                processingTime: `${processingTime}ms`
            }
        }
    }, {
        body: t.Object({
            message: t.String(),
            type: t.Optional(t.String()),
            data: t.Optional(t.Any())
        })
    })
    // Health check endpoint
    .get('/health', ({ request }) => {
        const startTime = Date.now()

        console.log('\n🏥 REST API: HEALTH CHECK')
        console.log(`IP: ${request.headers.get('x-forwarded-for') || request.headers.get('host') || 'unknown'}`)
        console.log(`Timestamp: ${new Date().toISOString()}`)

        const health = {
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            websocket: {
                totalClients: wsClients.size,
                channels: getChannelStats()
            }
        }

        console.log(`Status: ${health.status}`)
        console.log(`Uptime: ${Math.floor(health.uptime)}s`)
        console.log(`WebSocket Clients: ${health.websocket.totalClients}`)
        console.log(`Processing Time: ${Date.now() - startTime}ms\n`)

        return health
    })
    // Sound definitions endpoint
    .get('/sound-definitions', ({ request }) => {
        const startTime = Date.now()
        const requestId = `req-${startTime}-${Math.random().toString(36).substr(2, 9)}`

        console.log('\n🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵')
        console.log('🔊 REST API: GET SOUND DEFINITIONS')
        console.log('🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵')
        console.log(`Request ID: ${requestId}`)
        console.log(`Method: GET /sound-definitions`)
        console.log(`IP: ${request.headers.get('x-forwarded-for') || request.headers.get('host') || 'unknown'}`)
        console.log(`User-Agent: ${request.headers.get('user-agent') || 'unknown'}`)
        console.log(`Timestamp: ${new Date().toISOString()}`)
        console.log('----------------------------------------')

        const definitions = {
            jolanda: jolandaDefinition,
            lakatos: lakatosDefinition,
            myInstants: myInstantsDefinition,
            theChatWheel: theChatWheelDefinition
        }

        const processingTime = Date.now() - startTime


        return {
            success: true,
            requestId,
            definitions,
            summary: {
                jolanda: {
                    name: jolandaDefinition.name,
                    tilesCount: jolandaDefinition.tiles.length,
                    version: jolandaDefinition.version
                },
                lakatos: {
                    name: lakatosDefinition.name,
                    tilesCount: lakatosDefinition.tiles.length,
                    version: lakatosDefinition.version
                }
            },
            processingTime: `${processingTime}ms`
        }
    })
    // Get specific sound definition by name
    .get('/sound-definitions/:name', ({ params, request }) => {
        const startTime = Date.now()
        const requestId = `req-${startTime}-${Math.random().toString(36).substr(2, 9)}`

        console.log('\n🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵')
        console.log('🔊 REST API: GET SOUND DEFINITION BY NAME')
        console.log('🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵')
        console.log(`Request ID: ${requestId}`)
        console.log(`Method: GET /sound-definitions/${params.name}`)
        console.log(`IP: ${request.headers.get('x-forwarded-for') || request.headers.get('host') || 'unknown'}`)
        console.log(`User-Agent: ${request.headers.get('user-agent') || 'unknown'}`)
        console.log(`Timestamp: ${new Date().toISOString()}`)
        console.log('----------------------------------------')
        console.log(`Requested Definition: ${params.name}`)

        const name = params.name.toLowerCase()
        let definition = null
        let definitionName = ''

        if (name === 'jolanda') {
            definition = jolandaDefinition
            definitionName = 'jolanda'
        } else if (name === 'lakatos' || name === 'lakatoš') {
            definition = lakatosDefinition
            definitionName = 'lakatos'
        }

        const processingTime = Date.now() - startTime

        if (!definition) {
            console.log('❌ RESULT: Definition not found')
            console.log(`Available: jolanda, lakatos`)
            console.log(`⏱️ Processing Time: ${processingTime}ms`)
            console.log('🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵\n')

            return {
                success: false,
                requestId,
                message: `Sound definition "${params.name}" not found`,
                available: ['jolanda', 'lakatos'],
                processingTime: `${processingTime}ms`
            }
        }

        console.log('✅ RESULT: Definition found')
        console.log(`Name: ${definition.name}`)
        console.log(`Version: ${definition.version}`)
        console.log(`Language: ${definition.lang}`)
        console.log(`Tiles Count: ${definition.tiles.length}`)
        console.log(`⏱️ Processing Time: ${processingTime}ms`)
        console.log('🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵\n')

        return {
            success: true,
            requestId,
            name: definitionName,
            definition,
            processingTime: `${processingTime}ms`
        }
    })
