import { fileURLToPath } from "url"
import { dirname } from "path"
import fs from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const fileExists = (filePath) => {
  return fs.existsSync(filePath)
}

const deleteOldModels = (newModelName) => {
  try {
    const path = __dirname + "/model"
    const files = fs.readdirSync(path)

    for (const file of files) {
      if (file.toLowerCase().endsWith(".gguf") && file !== newModelName) {
        try {
          fs.unlinkSync(path + "/" + file)
        } catch (err) {
          //
        }
      }
    }
  } catch (err) {
    //
  }
}

const getFilenameFromUrl = (url) => {
  const segments = url.split("/")
  const lastSegment = segments.pop()
  const filename = lastSegment.split("?")[0]
  return filename
}

const downloadModel = async (url) => {
  try {
    const modelName = getFilenameFromUrl(url)

    if (fileExists(__dirname + "/model/" + modelName)) {
      console.log("The " + modelName + " file was already downloaded.")
      return
    }
    const response = await fetch(url)

    if (!response.ok) {
      console.log("Error when trying to download the file: " + response.statusText)
      return
    }

    const totalSize = Number(response.headers.get("content-length"))
    if (!totalSize) {
      console.log("Error. No content-length.")
      return
    }

    const fileStream = fs.createWriteStream(__dirname + "/model/" + modelName)

    let downloadedSize = 0
    const reader = response.body.getReader()

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      fileStream.write(value)
      downloadedSize += value.length
      const percentage = ((downloadedSize / totalSize) * 100).toFixed(2)

      process.stdout.write(
        "\rDownloading the AI model file... " +
          percentage +
          "% (" +
          (downloadedSize / 1024 / 1024).toFixed(2) +
          " MB / " +
          (totalSize / 1024 / 1024).toFixed(2) +
          " MB)"
      )
    }

    fileStream.end()
    process.stdout.write("\n")
    deleteOldModels(modelName)
    console.log("The AI model file was saved in the 'model' folder.")
  } catch (error) {
    console.error("Error during the downloading process: ", error)
  }
}

const args = process.argv?.slice(2)
const requestedModel = args[0].toLocaleLowerCase()

const MODEL_Q3_URL =
  "https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q3_K_L.gguf?download=true"

const MODEL_Q8_URL =
  "https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q8_0.gguf?download=true"

downloadModel(requestedModel === "q3" ? MODEL_Q3_URL : MODEL_Q8_URL)
