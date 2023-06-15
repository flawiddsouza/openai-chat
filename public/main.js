import { getModels, sendMessage } from './api.js'
import { marked } from 'https://cdnjs.cloudflare.com/ajax/libs/marked/5.1.0/lib/marked.esm.js'
import { showAlert, promptConfirm } from './helpers.js'

// data

let messages = [
    {
        role: 'system',
        content: `You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.`
    }
]

let newMessage = true
let waitingForResponse = false
let activeModel = null

// selectors

const selectors = {
    models: document.querySelector('#models'),
    messages: document.querySelector('#messages'),
    userInput: document.querySelector('#user-input'),
    sendUserInput: document.querySelector('#send-user-input'),
    clearChat: document.querySelector('#clear-chat'),
    regenerateResponse: document.querySelector('#regenerate-response'),
}

// methods

async function loadModels() {
    const models = await getModels()
    selectors.models.innerHTML = models.map(model => `<option value="${model.id}">${model.id}</option>`).join('')
    if(activeModel) {
        setModel(models.findIndex(model => model.id === activeModel))
    } else {
        setModel(models.findIndex(model => model.id === 'gpt-3.5-turbo'))
    }
}

function setModel(index) {
    selectors.models.selectedIndex = index
    activeModel = selectors.models.options[index].value
    saveToLocalStorage()
}

function renderMarkdown(markdown) {
    return marked(markdown, {
        headerIds: false,
        mangle: false,
    })
}

function addMessage(message, type) {
    if(type === 'assistant') {
        if(newMessage) {
            messages.push({
                role: 'assistant',
                content: message
            })
            selectors.messages.innerHTML += `<div class="assistant">${renderMarkdown(message)}</div>`
        } else {
            messages[messages.length - 1].content += message
            selectors.messages.lastChild.innerHTML = renderMarkdown(messages[messages.length - 1].content)
        }
    }

    if(type === 'user') {
        selectors.messages.innerHTML += `<div class="user"></div>`
        selectors.messages.lastChild.textContent = message
        messages.push({
            role: 'user',
            content: message
        })
    }

    if(type === 'error') {
        selectors.messages.innerHTML += `<div class="error">${message}</div>`
        messages.push({
            role: 'error',
            content: message
        })
    }

    selectors.messages.scrollTop = selectors.messages.scrollHeight

    saveToLocalStorage()
}

function sendMessageWrapper() {
    return sendMessage(activeModel, messages.filter(message => message.role !== 'error'))
}

function handleSendMessage() {
    if(waitingForResponse) {
        showAlert('Please wait for the response to finish generating.', { backgroundColor: 'darkblue' })
        return
    }

    if(!selectors.userInput.value) {
        return
    }

    addMessage(selectors.userInput.value, 'user')
    sendMessageWrapper()
    waitingForResponse = true
    selectors.userInput.value = ''
}

function saveToLocalStorage() {
    localStorage.setItem('openai-chat', JSON.stringify({
        activeModel,
        messages
    }))
}

function loadFromLocalStorage() {
    const data = JSON.parse(localStorage.getItem('openai-chat'))
    if(data) {
        activeModel = data.activeModel
        messages = data.messages
        messages.forEach(message => {
            if(message.role === 'system') {
                return
            }
            if(message.role === 'user') {
                selectors.messages.innerHTML += `<div class="user"></div>`
                selectors.messages.lastChild.textContent = message.content
            } else {
                selectors.messages.innerHTML += `<div class="${message.role}">${message.role === 'assistant' ? renderMarkdown(message.content) : message.content}</div>`
            }
        })
        selectors.messages.scrollTop = selectors.messages.scrollHeight
    }
}

// event handlers

const es = new EventSource('/sse')

es.addEventListener('message', (event) => {
    const payload = JSON.parse(event.data)
    addMessage(payload.message, 'assistant')
    newMessage = false
})

es.addEventListener('message-end', (event) => {
    const payload = JSON.parse(event.data)
    if(payload.error) {
        addMessage(payload.error, 'error')
    }
    newMessage = true
    waitingForResponse = false
})

es.addEventListener('error', (event) => {
    console.error(event)
})

selectors.models.addEventListener('change', () => {
    setModel(selectors.models.selectedIndex)
})

selectors.sendUserInput.addEventListener('click', handleSendMessage)

selectors.userInput.addEventListener('keydown', (event) => {
    if(!event.shiftKey && event.key === 'Enter') {
        event.preventDefault()
        handleSendMessage()
    }
})

selectors.clearChat.addEventListener('click', async() => {
    if(waitingForResponse) {
        showAlert('Please wait for the response to finish generating.', { backgroundColor: 'darkblue' })
        return
    }

    if(!await promptConfirm('Are you sure you want to clear the chat?')) {
        return
    }

    messages = []
    selectors.messages.innerHTML = ''
    saveToLocalStorage()
})

selectors.regenerateResponse.addEventListener('click', async() => {
    if(waitingForResponse) {
        showAlert('Please wait for the response to finish generating.', { backgroundColor: 'darkblue' })
        return
    }

    if(!await promptConfirm('Are you sure you want to regenerate the response?')) {
        return
    }

    if(messages[messages.length - 1].role === 'assistant' || messages[messages.length - 1].role === 'error') {
        messages.pop()
        selectors.messages.removeChild(selectors.messages.lastChild)
        saveToLocalStorage()
    }

    sendMessageWrapper()
    waitingForResponse = true
})

// init

loadFromLocalStorage()
loadModels()

window.showAlert = showAlert
