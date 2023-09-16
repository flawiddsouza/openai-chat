import { fetchEventSource } from 'fetch-event-source-hperrin'
import process from 'node:process'
import OpenAI from 'openai'

const OPENAI_API_BASE_URL = [
    'https://api.openai.com/v1',
    'https://api.endpoints.anyscale.com/v1'
]

function getOpenAPIKey(baseUrlIndex=0) {
    const OPENAI_API_KEY = [
        process.env.OPENAI_API_KEY,
        process.env.OPENAI_API_KEY_2
    ]

    return OPENAI_API_KEY[baseUrlIndex]
}

export async function getModels(baseUrlIndex=0) {
    const response = await fetch(`${OPENAI_API_BASE_URL[baseUrlIndex]}/models`, {
        headers: {
            Authorization: `Bearer ${getOpenAPIKey(baseUrlIndex)}`
        }
    })

    const responseData = await response.json()

    const models = responseData.data

    if(baseUrlIndex === 0) {
        return models.filter(model => model.id.startsWith('gpt') && !model.id.match(/-\d{4}$/))
    }

    return models
}

class RetriableError extends Error {}
class FatalError extends Error {}

function handleMessage(msg, onMessage, onMessageEnd, abortController) {
    let parsedMsg = msg
    if(typeof msg === 'string') {
        parsedMsg = JSON.parse(msg)
    }
    parsedMsg.choices.forEach(choice => {
        if(choice.delta.content) {
            onMessage(choice.delta.content)
        }

        if(choice.finish_reason !== null) {
            abortController.abort()
            onMessageEnd({ success: 'Chat completed' })
            return
        }
    })
}

export async function getCompletion(abortController, model, messages, onMessage, onMessageEnd, baseUrlIndex=0) {
    console.log(model, messages)

    if (baseUrlIndex === 1) {
        const openai = new OpenAI({
            apiKey: getOpenAPIKey(baseUrlIndex),
            baseURL: OPENAI_API_BASE_URL[baseUrlIndex]
        })

        const stream = await openai.chat.completions.create({
            model,
            messages,
            stream: true,
        })

        for await (const part of stream) {
            handleMessage(part, onMessage, onMessageEnd, abortController)
        }

        return
    }

    await fetchEventSource(`${OPENAI_API_BASE_URL[baseUrlIndex]}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getOpenAPIKey(baseUrlIndex)}`
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: 1,
            stream: true,
        }),
        signal: abortController.signal,
        async onopen(response) {
            const EventStreamContentType = 'text/event-stream'

            if(response.ok && response.headers.get('content-type') === EventStreamContentType) {
                return // everything's good
            } else if(response.status >= 400 && response.status < 500 && response.status !== 429) {
                let errorMessage = 'Unknown error'

                if(response.headers.get('content-type') === 'application/json') {
                    const responseBody = await response.json()
                    errorMessage = responseBody.error.message
                } else {
                    errorMessage = await response.text()
                }

                abortController.abort()
                onMessageEnd({ error: errorMessage })

                throw new FatalError()
            } else {
                throw new RetriableError()
            }
        },
        onmessage(msg) {
            handleMessage(msg.data, onMessage, onMessageEnd, abortController)
        }
    })
}
