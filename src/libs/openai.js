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
        return models.filter(model => model.id.startsWith('gpt') && !model.id.match(/-\d{4}$/) && !model.id.includes('-instruct'))
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

    if (parsedMsg.error) {
        abortController.abort()
        onMessageEnd({ error: parsedMsg.error.message })
        return
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

    const openai = new OpenAI({
        apiKey: getOpenAPIKey(baseUrlIndex),
        baseURL: OPENAI_API_BASE_URL[baseUrlIndex]
    })

    const stream = openai.beta.chat.completions.stream({
        model,
        messages,
        temperature: 1,
        stream: true,
    })

    stream.on('abort', e => console.log(e))

    abortController.signal.addEventListener('abort', () => {
        stream.controller.abort()
    })

    for await (const part of stream) {
        handleMessage(part, onMessage, onMessageEnd, abortController)
    }

    try {
        await stream.finalContent()
    } catch (error) {
        console.log(error)
    }
}
