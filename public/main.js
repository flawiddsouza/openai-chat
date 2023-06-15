import { getModels, sendMessage } from './api.js'
import { marked } from 'https://cdnjs.cloudflare.com/ajax/libs/marked/5.1.0/lib/marked.esm.js'
import { showAlert, promptConfirm } from './helpers.js'
import { nanoid } from './libs/nanoid.js'

// data

let conversations = [
    {
        id: 'default',
        name: 'Conversation 1'
    }
]

let messages = {
    default: initMessages()
}

let activeModel = null
let activeConversationId = 'default'
let newMessage = true
let waitingForResponse = false

// selectors

const selectors = {
    addConversation: document.querySelector('#add-conversation'),
    conversations: document.querySelector('#conversations'),
    models: document.querySelector('#models'),
    messages: document.querySelector('#messages'),
    userInput: document.querySelector('#user-input'),
    sendUserInput: document.querySelector('#send-user-input'),
    clearChat: document.querySelector('#clear-chat'),
    regenerateResponse: document.querySelector('#regenerate-response'),
}

// methods

function initMessages() {
    return [
        {
            role: 'system',
            content: `You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.`
        }
    ]
}

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

function renderMessages() {
    selectors.messages.innerHTML = ''

    messages[activeConversationId].forEach(message => {
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

function addMessage(message, type) {
    if(type === 'assistant') {
        if(newMessage) {
            messages[activeConversationId].push({
                role: 'assistant',
                content: message
            })
            selectors.messages.innerHTML += `<div class="assistant">${renderMarkdown(message)}</div>`
        } else {
            messages[activeConversationId][messages[activeConversationId].length - 1].content += message
            selectors.messages.lastChild.innerHTML = renderMarkdown(messages[activeConversationId][messages[activeConversationId].length - 1].content)
        }
    }

    if(type === 'user') {
        selectors.messages.innerHTML += `<div class="user"></div>`
        selectors.messages.lastChild.textContent = message
        messages[activeConversationId].push({
            role: 'user',
            content: message
        })
    }

    if(type === 'error') {
        selectors.messages.innerHTML += `<div class="error">${message}</div>`
        messages[activeConversationId].push({
            role: 'error',
            content: message
        })
    }

    selectors.messages.scrollTop = selectors.messages.scrollHeight

    saveToLocalStorage()
}

function sendMessageWrapper() {
    return sendMessage(activeModel, messages[activeConversationId].filter(message => message.role !== 'error'))
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
    if(messages[activeConversationId].filter(item => item.role === 'assistant').length === 0) {
        const activeConversation = getConversation(activeConversationId)
        if(activeConversation.name === 'New Conversation') {
            renameConversation(activeConversationId, selectors.userInput.value.slice(0, 30))
        }
    }
    sendMessageWrapper()
    waitingForResponse = true
    selectors.userInput.value = ''
}

function saveToLocalStorage() {
    localStorage.setItem('openai-chat', JSON.stringify({
        conversations,
        activeConversationId,
        activeModel,
        messages
    }))
}

function loadFromLocalStorage() {
    const data = JSON.parse(localStorage.getItem('openai-chat'))
    if(data) {
        conversations = data.conversations
        activeConversationId = data.activeConversationId
        activeModel = data.activeModel
        messages = data.messages
        renderMessages()
    }
}

function renderConversations() {
    selectors.conversations.innerHTML = conversations.slice().reverse().map(conversation => {
        return `<div class="conversation ${conversation.id === activeConversationId ? 'active' : ''}" data-id="${conversation.id}">
            <div>${conversation.name}</div>
            <div>
                <button class="rename-conversation">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-pencil"><path d="M4 20h4l10.5 -10.5a1.5 1.5 0 0 0 -4 -4l-10.5 10.5v4"></path><path d="M13.5 6.5l4 4"></path></svg>
                </button>
                <button class="delete-conversation">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-trash"><path d="M4 7l16 0"></path><path d="M10 11l0 6"></path><path d="M14 11l0 6"></path><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"></path><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"></path></svg>
                </button>
            </div>
        </div>`
    }).join('')
}

function getConversation(id) {
    return conversations.find(conversation => conversation.id === id)
}

function addConversation(name) {
    const id = nanoid()

    conversations.push({
        id,
        name
    })

    messages[id] = initMessages()

    setActiveConversation(id)

    saveToLocalStorage()
}

function renameConversation(id, name) {
    const conversation = getConversation(id)
    conversation.name = name
    saveToLocalStorage()
    renderConversations()
}

function deleteConversation(id) {
    const index = conversations.findIndex(conversation => conversation.id === id)
    conversations.splice(index, 1)

    if(conversations.length === 0) {
        addConversation('Conversation 1')
    }

    if(activeConversationId === id) {
        setActiveConversation(conversations[index] ? conversations[index].id : conversations[index - 1].id)
    } else {
        renderConversations()
    }

    saveToLocalStorage()
}

function setActiveConversation(id) {
    activeConversationId = id
    renderConversations()
    renderMessages()
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

selectors.addConversation.addEventListener('click', () => {
    addConversation('New Conversation')
})

selectors.conversations.addEventListener('click', async(event) => {
    let element

    if(element = event.target.closest('.rename-conversation')) {
        const id = element.closest('[data-id]').dataset.id
        const conversation = getConversation(id)
        const name = prompt('Enter a new name for the conversation:', conversation.name)
        if(name) {
            renameConversation(id, name)
        }
        return
    }

    if(element = event.target.closest('.delete-conversation')) {
        const id = element.closest('[data-id]').dataset.id
        if(!await promptConfirm('Are you sure you want to delete this conversation?')) {
            return
        }
        deleteConversation(id)
        return
    }

    if(element = event.target.closest('.conversation')) {
        const id = element.dataset.id
        setActiveConversation(id)
        saveToLocalStorage()
        return
    }
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

    messages[activeConversationId] = initMessages()
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

    if(messages[activeConversationId][messages[activeConversationId].length - 1].role === 'assistant' || messages[activeConversationId][messages[activeConversationId].length - 1].role === 'error') {
        messages[activeConversationId].pop()
        selectors.messages.removeChild(selectors.messages.lastChild)
        saveToLocalStorage()
    }

    sendMessageWrapper()
    waitingForResponse = true
})

// init

loadFromLocalStorage()
loadModels()
renderConversations()

window.showAlert = showAlert
