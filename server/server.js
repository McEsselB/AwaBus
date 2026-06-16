const app = require('./app')
const connectDB = require('./config/db.js')

const PORT = process.env.PORT || 5000

async function start() {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`\n🚌 AwaBus API running on port ${PORT} [${process.env.NODE_ENV}]`)
  })
}

start()