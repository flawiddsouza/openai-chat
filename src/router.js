import { createRouter } from './libs/server.js'
import { getModels, getCompletion } from './libs/openai.js'

const router = createRouter()

router.get('/models', async(req, res) => {
    res.send(await getModels())
})

router.get('/sse', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    })

    req.on('close', () => {
        console.log('Client disconnected')
    })

    req.on('error', (e) => {
        console.log('Client error', e.message)
    })

    req.app.on('message', (payload) => {
        res.write(`event: message\n`)
        res.write(`data: ${JSON.stringify(payload)}\n\n`)
    })

    req.app.on('message-end', (payload) => {
        res.write(`event: message-end\n`)
        res.write(`data: ${JSON.stringify(payload)}\n\n`)
    })
})

const abortControllers = {}

router.post('/message', async(req, res) => {
    const { conversationId, model, messages } = req.body

    abortControllers[conversationId] = new AbortController()

    getCompletion(
        abortControllers[conversationId],
        model,
        messages,
        data => {
            req.app.emit('message', {
                conversationId,
                message: data
            })
        },
        data => {
            req.app.emit('message-end', { conversationId, ...data })
        }
    ).then(() => {})

    res.send({ message: 'Completion initiated' })
})

router.post('/stop', async(req, res) => {
    const { conversationId } = req.body
    abortControllers[conversationId].abort()
    req.app.emit('message-end', { conversationId, success: 'Completion stopped' })
    res.send({ message: 'Completion stopped' })
})

export default router
