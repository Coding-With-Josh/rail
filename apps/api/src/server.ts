import "dotenv/config"
import { buildApp } from "./app.js"

const start = async () => {
  const app = await buildApp()

  try {
    await app.listen({
      port: Number(process.env.PORT) || 4000,
      host: "0.0.0.0",
    })
    console.log(`Rail API running on port ${process.env.PORT || 4000}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
