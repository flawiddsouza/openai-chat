import { getModels, getPrompts, sendMessage, stopGenerating } from './api.js'
import { marked } from './libs/marked.esm.js'
import hljs from './libs/highlight.js@11.8.0/highlight.min.js'
import { showAlert, promptConfirm } from './helpers.js'
import { nanoid } from './libs/nanoid.js'
import './web-components/autosize.js'

// data

let activePrompt = null

let conversations = [
    {
        id: 'default',
        name: 'New Conversation'
    }
]

let messages = {
    default: initMessages()
}

let activeModel = null
let activeConversationId = 'default'
const newMessage = {
    'default': true
}
const waitingForResponse = {
    'default': false
}

let useUrl = 0

let prompts = []

// selectors

const selectors = {
    hamburgerMenu: document.querySelector('#hamburger-menu'),
    sidebar: document.querySelector('#sidebar'),
    sidebarOverlay: document.querySelector('#sidebar-overlay'),
    addConversation: document.querySelector('#add-conversation'),
    conversations: document.querySelector('#conversations'),
    models: document.querySelector('#models'),
    prompts: document.querySelector('#prompts'),
    messages: document.querySelector('#messages'),
    stopGenerating: document.querySelector('#stop-generating'),
    regenerateResponse: document.querySelector('#regenerate-response'),
    userInput: document.querySelector('#user-input'),
    sendUserInput: document.querySelector('#send-user-input'),
    clearChat: document.querySelector('#clear-chat'),
}

// methods

function initMessages() {
    let content = `You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.`

    if(activePrompt && activePrompt.name !== 'Custom') {
        content = activePrompt.prompt
    }

    // if custom prompt is set, reset selector to 0, which is Default
    if(activePrompt && activePrompt.name === 'Custom') {
        selectors.prompts.selectedIndex = 0
    }

    return [
        {
            role: 'system',
            content
        }
    ]
}

function toggleSidebar() {
    selectors.sidebar.classList.toggle('open')
    selectors.sidebarOverlay.classList.toggle('open')
}

async function loadModels() {
    const models = await getModels(useUrl)
    selectors.models.innerHTML = models.map(model => `<option value="${model.id}">${model.id}</option>`).join('')

    let index = -1

    if(activeModel) {
        index = models.findIndex(model => model.id === activeModel)
    }

    if(index === -1) {
        index = models.findIndex(model => model.id === 'gpt-3.5-turbo')
    }

    if(index === -1) {
        index = models.findIndex(model => model.id === 'meta-llama/Llama-2-70b-chat-hf')
    }

    if(index === -1) {
        index = 0
    }

    setModel(index)
}

function renderPrompts() {
    selectors.prompts.innerHTML = prompts.map(prompt => `<option value="${prompt.name}" ${prompt.name === 'Custom' ? 'disabled' : ''}>${prompt.name}</option>`).join('')
    const activePromptContent = messages[activeConversationId][0].content
    activePrompt = prompts.find(prompt => prompt.prompt === activePromptContent)
    if(!activePrompt) {
        activePrompt = prompts.find(prompt => prompt.name === 'Custom')
    }
    const index = prompts.findIndex(prompt => prompt.name === activePrompt.name)
    selectors.prompts.selectedIndex = index
}

async function loadPrompts() {
    prompts = await getPrompts()
    renderPrompts()
}

function setModel(index) {
    selectors.models.selectedIndex = index
    activeModel = selectors.models.options[index].value
    saveToLocalStorage()
}

function setPrompt(index) {
    const selectedPromptName = selectors.prompts.options[index].value
    const selectedPrompt = prompts.find(prompt => prompt.name === selectedPromptName).prompt
    messages[activeConversationId][0].content = selectedPrompt
    saveToLocalStorage()
    renderMessages(false)
}

class CustomRenderer extends marked.Renderer {
    code(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext'
        const highlightedCode = hljs.highlight(code, { language }).value
        return `
            <div class="code-block">
                <div class="code-block-header">
                    <div>${language ?? 'Plain Text'}</div>
                    <button class="copy-code">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-clipboard"><path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2"></path><path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z"></path></svg>
                        Copy Code
                    </button>
                </div>
                <pre><code>${highlightedCode}</code></pre>
            </div>
        `
    }
}

const customRenderer = new CustomRenderer();

function renderMarkdown(markdown) {
    return marked(markdown, {
        headerIds: false,
        mangle: false,
        renderer: customRenderer
    })
}

function renderUserMessage(messageIndex, message, edit = false) {
    if(!edit) {
        selectors.messages.innerHTML += `
        <div class="message">
            <div class="user"></div>
            <div class="actions">
                <button class="edit-message" data-message-index="${messageIndex}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-edit" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" />
                        <path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z" />
                        <path d="M16 5l3 3" />
                    </svg>
                </button>
                <button class="delete-message" data-message-index="${messageIndex}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-trash"><path d="M4 7l16 0"></path><path d="M10 11l0 6"></path><path d="M14 11l0 6"></path><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"></path><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"></path></svg>
                </button>
            </div>
        </div>`
        selectors.messages.lastChild.querySelector('.user').textContent = message
    } else {
        selectors.messages.innerHTML += `
        <div class="message">
            <textarea is="auto-size" spellcheck="false" class="user" style="border: 0; outline: 0; padding: 0;" class="edit-message" data-message-index="${messageIndex}">${message}</textarea>
            <div class="actions">
                <button class="cancel-edit-message" data-message-index="${messageIndex}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-edit-off" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" />
                    <path d="M10.507 10.498l-1.507 1.502v3h3l1.493 -1.498m2 -2.01l4.89 -4.907a2.1 2.1 0 0 0 -2.97 -2.97l-4.913 4.896" />
                    <path d="M16 5l3 3" />
                    <path d="M3 3l18 18" />
                </svg>
                </button>
                <button class="delete-message" data-message-index="${messageIndex}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-trash"><path d="M4 7l16 0"></path><path d="M10 11l0 6"></path><path d="M14 11l0 6"></path><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"></path><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"></path></svg>
                </button>
            </div>
        </div>`
    }
}

function renderMessages(scrollToBottom = true) {
    if(activeConversationId in newMessage === false) {
        newMessage[activeConversationId] = true
    }

    if(activeConversationId in waitingForResponse == false) {
        waitingForResponse[activeConversationId] = false
    }

    selectors.messages.innerHTML = ''

    messages[activeConversationId].forEach((message, messageIndex) => {
        if(message.role === 'user') {
            renderUserMessage(messageIndex, message.content, message.edit)
        } else if(message.role === 'system') {
            if(messages[activeConversationId].length === 1) {
                selectors.messages.innerHTML += `<div class="system"><textarea is="auto-size" spellcheck="false">${message.content}</textarea></div>`
                selectors.messages.lastChild.querySelector('textarea').addEventListener('input', event => {
                    messages[activeConversationId][messageIndex].content = event.target.value
                    renderPrompts() // refresh prompts when system prompt changes
                    saveToLocalStorage()
                })
            } else {
                selectors.messages.innerHTML += `<div class="system">${message.content}</div>`
            }
        } else {
            selectors.messages.innerHTML += `<div class="${message.role}">${message.role === 'assistant' ? renderMarkdown(message.content) : message.content}</div>`
        }
    })

    if(scrollToBottom) {
        selectors.messages.scrollTop = selectors.messages.scrollHeight
    }

    renderPrompts()
}

const blinkingCursor = '<span class="cursor animate-pulse">▍</span>'

function addMessage(conversationId, message, type) {
    // when user sends the first message, remove system prompt textarea
    // and replace it with content of the textarea
    if(messages[conversationId].length === 1) {
        selectors.messages.firstChild.innerHTML = messages[conversationId][0].content
    }

    if(type === 'assistant') {
        if(newMessage[conversationId]) {
            messages[conversationId].push({
                role: 'assistant',
                content: message
            })
            if(conversationId === activeConversationId) {
                selectors.messages.innerHTML += `<div class="assistant">${renderMarkdown(message)}</div>`
                selectors.messages.lastChild.lastElementChild.innerHTML += blinkingCursor
            }
        } else {
            messages[conversationId][messages[conversationId].length - 1].content += message
            if(conversationId === activeConversationId) {
                selectors.messages.lastChild.innerHTML = renderMarkdown(messages[conversationId][messages[conversationId].length - 1].content)
                selectors.messages.lastChild.lastElementChild.innerHTML += blinkingCursor
            }
        }
    }

    if(type === 'user') {
        messages[conversationId].push({
            role: 'user',
            content: message
        })
        const messageIndex = messages[conversationId].length - 1
        renderUserMessage(messageIndex, message)
    }

    if(type === 'error') {
        if(conversationId === activeConversationId) {
            selectors.messages.innerHTML += `<div class="error">${message}</div>`
        }
        messages[conversationId].push({
            role: 'error',
            content: message
        })
    }

    selectors.messages.scrollTop = selectors.messages.scrollHeight

    saveToLocalStorage()
}

function sendMessageWrapper() {
    const messagesToSend = messages[activeConversationId].filter(message => message.role !== 'error').map(messsage => {
        return {
            role: messsage.role,
            content: messsage.content
        }
    })

    sendMessage(activeConversationId, activeModel, messagesToSend, useUrl)
    waitingForResponse[activeConversationId] = true
}

function handleSendMessage() {
    if(waitingForResponse[activeConversationId]) {
        showAlert('Please wait for the response to finish generating.', { backgroundColor: 'darkblue' })
        return
    }

    if(!selectors.userInput.value) {
        return
    }

    addMessage(activeConversationId, selectors.userInput.value, 'user')
    if(messages[activeConversationId].filter(item => item.role === 'assistant').length === 0) {
        const activeConversation = getConversation(activeConversationId)
        if(activeConversation.name === 'New Conversation') {
            renameConversation(activeConversationId, selectors.userInput.value.slice(0, 30))
        }
    }
    sendMessageWrapper()
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
    } else {
        renderMessages() // without this the system prompt won't be shown the very first time the app is loaded
    }
}

function escapeHTML(html) {
    return new Option(html).innerHTML
}

function renderConversations() {
    selectors.conversations.innerHTML = conversations.slice().reverse().map(conversation => {
        return `<div class="conversation ${conversation.id === activeConversationId ? 'active' : ''}" data-id="${conversation.id}">
            <div>${escapeHTML(conversation.name)}</div>
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

    delete messages[id]

    if(conversations.length === 0) {
        addConversation('New Conversation')
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

function init() {
    const urlParams = new URLSearchParams(document.location.search)
    useUrl = parseInt(urlParams.get('use_url')) || 0
}

// event handlers

const es = new EventSource('/sse')

es.addEventListener('message', (event) => {
    const payload = JSON.parse(event.data)
    if(payload.conversationId in messages === false) {
        return
    }
    addMessage(payload.conversationId, payload.message, 'assistant')
    newMessage[payload.conversationId] = false
})

es.addEventListener('message-end', (event) => {
    const payload = JSON.parse(event.data)

    if(payload.conversationId in messages === false) {
        return
    }

    if(payload.error) {
        addMessage(payload.conversationId, payload.error, 'error')
    }

    newMessage[payload.conversationId] = true
    waitingForResponse[payload.conversationId] = false

    if(payload.conversationId === activeConversationId) {
        selectors.messages.lastChild.querySelector('.cursor').remove()
    }
})

es.addEventListener('error', (event) => {
    console.error(event)
})

selectors.hamburgerMenu.addEventListener('click', () => {
    toggleSidebar()
})

document.addEventListener('click', (event) => {
    if (!selectors.sidebar.contains(event.target) && !selectors.hamburgerMenu.contains(event.target) && selectors.sidebar.classList.contains('open')) {
        toggleSidebar()
    }
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

selectors.prompts.addEventListener('change', () => {
    setPrompt(selectors.prompts.selectedIndex)
})

selectors.stopGenerating.addEventListener('click', () => {
    stopGenerating(activeConversationId)
})

selectors.regenerateResponse.addEventListener('click', async() => {
    if(!await promptConfirm('Are you sure you want to regenerate the response?')) {
        return
    }

    if(messages[activeConversationId][messages[activeConversationId].length - 1].role === 'assistant' || messages[activeConversationId][messages[activeConversationId].length - 1].role === 'error') {
        messages[activeConversationId].pop()
        selectors.messages.removeChild(selectors.messages.lastChild)
        saveToLocalStorage()
    }

    sendMessageWrapper()
})

selectors.sendUserInput.addEventListener('click', handleSendMessage)

selectors.userInput.addEventListener('keydown', (event) => {
    if(!event.shiftKey && event.key === 'Enter') {
        event.preventDefault()
        handleSendMessage()
    }
})

selectors.clearChat.addEventListener('click', async() => {
    if(waitingForResponse[activeConversationId]) {
        showAlert('Please wait for the response to finish generating.', { backgroundColor: 'darkblue' })
        return
    }

    if(!await promptConfirm('Are you sure you want to clear the chat?')) {
        return
    }

    messages[activeConversationId] = initMessages()
    selectors.messages.innerHTML = ''
    renderMessages() // system prompt is not shown otherwise
    saveToLocalStorage()
})

document.addEventListener('click', async(event) => {
    if(event.target.closest('.copy-code')) {
        const code = event.target.closest('.copy-code').parentElement.nextElementSibling.textContent
        navigator.clipboard.writeText(code)
        showAlert('Code copied to clipboard', { backgroundColor: '#28a745' })
    }

    if(event.target.closest('.edit-message')) {
        if(waitingForResponse[activeConversationId]) {
            showAlert('Please wait for the response to finish generating.', { backgroundColor: 'darkblue' })
            return
        }

        messages[activeConversationId][event.target.closest('.edit-message').dataset.messageIndex].edit = true
        renderMessages(false)
    }

    if(event.target.closest('.cancel-edit-message')) {
        messages[activeConversationId][event.target.closest('.cancel-edit-message').dataset.messageIndex].edit = false
        renderMessages(false)
    }

    if(event.target.closest('.delete-message')) {
        if(waitingForResponse[activeConversationId]) {
            showAlert('Please wait for the response to finish generating.', { backgroundColor: 'darkblue' })
            return
        }

        if(!await promptConfirm('Are you sure you want to delete this message?')) {
            return
        }
        const messageIndex = event.target.closest('.delete-message').dataset.messageIndex
        messages[activeConversationId].splice(messageIndex, messages[activeConversationId].length - messageIndex)
        saveToLocalStorage()
        renderMessages()
    }
})

document.addEventListener('input', (event) => {
    if(event.target.closest('textarea.user')) {
        const messageIndex = event.target.closest('textarea.user').dataset.messageIndex
        messages[activeConversationId][messageIndex].content = event.target.value
        saveToLocalStorage()
    }
})

setInterval(() => {
    if(messages[activeConversationId].length === 1) {
        selectors.regenerateResponse.style.display = 'none'
    } else {
        if(waitingForResponse[activeConversationId]) {
            selectors.stopGenerating.style.display = 'flex'
            selectors.regenerateResponse.style.display = 'none'
        } else {
            selectors.stopGenerating.style.display = 'none'
            selectors.regenerateResponse.style.display = 'flex'
        }
    }
}, 100)

// init

init()
loadFromLocalStorage()
loadModels()
loadPrompts()
renderConversations()
