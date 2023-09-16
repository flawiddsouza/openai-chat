export async function getModels(useUrl = 0) {
    const response = await fetch(`/models?useUrl=${useUrl}`)
    return response.json()
}

export async function sendMessage(conversationId, model, messages, useUrl = 0) {
    const response = await fetch('/message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ conversationId, model, messages, useUrl }),
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
