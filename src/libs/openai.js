import { fetchEventSource } from 'fetch-event-source-hperrin'

export async function getModels() {
    const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
    })

    const responseData = await response.json()

    const models = responseData.data.filter(model => model.id.startsWith('gpt'))

    return models
}

export async function getCompletion(model, messages, onMessage, onMessageEnd) {
    const ctrl = new AbortController()

    console.log(model, messages)

    await fetchEventSource('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: 1,
            stream: true,
        }),
        signal: ctrl.signal,
        onmessage(msg) {
            const parsedMsg = JSON.parse(msg.data)
            parsedMsg.choices.forEach(choice => {
                if(choice.delta.content) {
                    onMessage(choice.delta.content)
                }

                if(choice.finish_reason !== null) {
                    ctrl.abort()
                    onMessageEnd()
                    return
                }
            })
        },
        onerror(err) {
            console.log(err)
            ctrl.abort()
        }
    })
}
