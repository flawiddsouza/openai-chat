export async function getModels() {
    const response = await fetch('/models')
    return response.json()
}

export async function sendMessage(conversationId, model, messages) {
    const response = await fetch('/message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ conversationId, model, messages }),
    })
    return response.json()
}

export async function stopGenerating(conversationId) {
    const response = await fetch('/stop', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ conversationId }),
    })
    return response.json()
}
