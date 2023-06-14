import express from 'express'

export function initServer(router, port) {
    const app = express()

    app.use(express.json())
    app.use(express.static('public'))
    app.use(router)

    app.listen(port, () => {
        console.log(`Listening at http://localhost:${port}`)
    })
}

export function createRouter() {
    return express.Router()
}
