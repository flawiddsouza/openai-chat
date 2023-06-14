export async function getModels() {
    const response = await fetch('/models')
    return response.json()
}

export async function sendMessage(model, messages) {
    const response = await fetch('/message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model, messages }),
    })
    return response.json()
}
