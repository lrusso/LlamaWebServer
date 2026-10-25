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

    // the file is downloaded with a temporary name, so an interrupted download
    // isn't taken as an already downloaded file
    const fileStream = fs.createWriteStream(
      __dirname + "/model/" + modelName + ".part"
    )

    let downloadedSize = 0
    const reader = response.body.getReader()

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      // waiting when the disk is slower than the network, so the downloaded
      // data doesn't pile up in memory
      if (!fileStream.write(value)) {
        await new Promise((resolve) => fileStream.once("drain", resolve))
      }

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

    // waiting for all the data to be written before giving the file its name
    await new Promise((resolve) => fileStream.end(resolve))
    fs.renameSync(
      __dirname + "/model/" + modelName + ".part",
      __dirname + "/model/" + modelName
    )

    process.stdout.write("\n")
    deleteOldModels(modelName)
    console.log("The AI model file was saved in the 'model' folder.")
  } catch (error) {
    console.log("Error during the downloading process: ", error)
  }
}

const args = process.argv?.slice(2)
const requestedModel = args.length > 0 ? args[0].toLocaleLowerCase() : ""

const MODEL_Q4_URL =
  "https://huggingface.co/unsloth/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it-Q4_K_M.gguf?download=true"

const MODEL_Q8_URL =
  "https://huggingface.co/unsloth/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it-Q8_0.gguf?download=true"

downloadModel(requestedModel === "q4" ? MODEL_Q4_URL : MODEL_Q8_URL)
