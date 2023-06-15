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

router.post('/message', async(req, res) => {
    const { model, messages } = req.body

    getCompletion(
        model,
        messages,
        data => {
            req.app.emit('message', {
                message: data
            })
        },
        data => {
            req.app.emit('message-end', data)
        }
    ).then(() => {})

    res.send({ message: 'Completion initiated' })
})

export default router
