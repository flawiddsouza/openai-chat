import { initServer } from './libs/server.js'
import router from './router.js'
import dotenv from 'dotenv'

dotenv.config()

initServer(router, process.env.PORT || 6033)
