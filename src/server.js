import {
  getLlama,
  LlamaChatSession,
  HarmonyChatWrapper,
  readGgufFileInfo,
} from "node-llama-cpp"
import { TaskQueue } from "./taskQueue.js"
import { fileURLToPath } from "url"
import { dirname } from "path"
import http from "http"
import fs from "fs"

const taskQueue = new TaskQueue()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const ROOT_FOLDER = "/public"
const ERROR_INTERNAL_SERVER_ERROR = "Internal Server Error"

const CHUNK_SIZE_IN_MB = 10

const args = process.argv?.slice(2)
const serverPort = args.length > 0 ? args[0] : 80

const modelFilename = fs
  .readdirSync(__dirname + "/model/")
  .find((file) => file.endsWith(".gguf"))

const countGGUFFiles = fs
  .readdirSync(__dirname + "/model/")
  .filter((file) => file.endsWith(".gguf")).length

if (!modelFilename) {
  console.log("Error: Please put a GGUF file in the model folder.")
  process.exit(1)
}

if (countGGUFFiles > 1) {
  console.log("Error: You can have only 1 GGUF file in the model folder.")
  process.exit(1)
}

console.log("Loading AI model, please wait...")

const llama = await getLlama()
const model = await llama.loadModel({
  modelPath: __dirname + "/model/" + modelFilename,
})
const modelMetadata = await readGgufFileInfo(__dirname + "/model/" + modelFilename)
const modelArchitecture = modelMetadata.metadata["general.architecture"]

const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

const getContext = async (retry = 0) => {
  let context = null
  try {
    context = await model.createContext({ contextSize: "auto" })
  } catch (err) {
    if (retry < 10) {
      await sleep(5000)
      const newContext = await getContext(retry + 1)
      return newContext
    }
  }
  return context
}

const safeDispose = async (tempSession, tempContext) => {
  try {
    tempSession.dispose()
  } catch (err) {
    //
  }
  try {
    await tempContext.dispose()
  } catch (err) {
    //
  }
}

const askLlama = async (req, res) => {
  taskQueue.enqueue(async () => {
    // CHECKING IF THE USER CLOSED THE WINDOW
    if (req.socket.destroyed) {
      return
    }

    let body = ""
    req.on("data", (chunk) => {
      body = body + chunk.toString()
    })

    await new Promise((resolve) => req.on("end", resolve)) // WAITING FOR ALL DATA TO BE RECEIVED

    let context
    let session

    try {
      const chatHistory = JSON.parse(body)
      context = await getContext()

      if (modelArchitecture === "gpt2" || modelArchitecture === "gpt-neox") {
        // any chatgpt model (oss) provided by openai
        session = new LlamaChatSession({
          contextSequence: context.getSequence(),
          reasoningFormat: "auto",
          chatWrapper: new HarmonyChatWrapper({
            modelIdentity:
              "You are ChatGPT, a large language model trained by OpenAI.",
            reasoningEffort: "high",
          }),
        })
      } else {
        // any llama model
        session = new LlamaChatSession({
          contextSequence: context.getSequence(),
          systemPrompt: chatHistory[0].content,
        })
      }

      session.setChatHistory(chatHistory)

      res.writeHead(200, {
        "Content-Type": "text/plain",
      })

      let reply = ""

      await session.prompt(chatHistory[chatHistory.length - 1].content, {
        temperature: 0.8,
        topP: 0.9,
        topK: 40,
        async onResponseChunk({ segmentType, text }) {
          if (segmentType) {
            return
          }

          res.write(text)
          reply = reply + text

          if (reply.length > 100) {
            const toFind = reply.substring(reply.length - 30, reply.length)
            const repeatedText = reply.split(toFind).length - 1
            if (repeatedText > 10) {
              await safeDispose(session, context)
            }
          }
        },
      })
    } catch (err) {
      if (err.message !== "Object is disposed") {
        console.log("ERROR: " + err.message)
      }
    } finally {
      res.end()
      await safeDispose(session, context)
    }
  })
}

const isFolder = (path) => {
  try {
    const stats = fs.statSync(path)
    return stats.isDirectory()
  } catch (error) {
    return false
  }
}

const isFile = (path) => {
  try {
    const stats = fs.statSync(path)
    return stats.isFile()
  } catch (error) {
    return false
  }
}

const handleRequest = (req, res) => {
  const baseURL =
    (req.protocol ? req.protocol : "http") + "://" + req.headers.host + "/"
  const reqUrl = new URL(req.url, baseURL)

  if (req.url === "/ask") {
    askLlama(req, res)
    return
  }

  const requestedFilename =
    reqUrl.pathname === "/" ? ROOT_FOLDER : ROOT_FOLDER + reqUrl.pathname
  const requestedPath = __dirname + decodeURIComponent(requestedFilename)
  const indexPath = __dirname + decodeURIComponent(requestedFilename) + "/index.html"
  const rootIndexPath = __dirname + decodeURIComponent(ROOT_FOLDER) + "/index.html"

  if (reqUrl.pathname === "/" && isFile(rootIndexPath)) {
    const filePath = rootIndexPath
    const fileSize = fs.statSync(filePath).size
    const readStream = fs.createReadStream(filePath)
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "text/html",
      "Accept-Ranges": "bytes",
    })
    readStream.pipe(res)
    return
  }

  if (
    isFolder(requestedPath) &&
    isFile(indexPath) &&
    reqUrl.pathname.endsWith("/")
  ) {
    const filePath = indexPath
    const fileSize = fs.statSync(filePath).size
    const readStream = fs.createReadStream(filePath)
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "text/html",
      "Accept-Ranges": "bytes",
    })
    readStream.pipe(res)
    return
  }

  if (
    isFolder(requestedPath) &&
    isFile(indexPath) &&
    !reqUrl.pathname.endsWith("/")
  ) {
    res.writeHead(302, {
      Location: reqUrl.pathname + "/",
    })
    res.end()
    return
  }

  if (!fs.existsSync(requestedPath)) {
    res.writeHead(302, {
      Location: baseURL,
    })
    res.end()
    return
  }

  if (isFolder(requestedPath)) {
    const folderName = decodeURIComponent(requestedFilename).substring(
      ROOT_FOLDER.length,
      decodeURIComponent(requestedFilename).length
    )
    const folderUp = folderName.substring(0, folderName.lastIndexOf("/"))
    const folderContent = fs.readdirSync(requestedPath).sort((a, b) => {
      const aIsDir = isFolder(requestedPath + "/" + a),
        bIsDir = isFolder(requestedPath + "/" + b)
      if (aIsDir && !bIsDir) {
        return -1
      }
      if (!aIsDir && bIsDir) {
        return 1
      }
      return a.localeCompare(b)
    })

    const contentHeader =
      `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Index of ` +
      (folderName !== "" ? folderName : "/") +
      `</title></head><body><h1>Index of ` +
      (folderName !== "" ? folderName : "/") +
      `</h1><hr><table>`

    let contentBody =
      requestedFilename !== ROOT_FOLDER
        ? `<tr><td>[DIR]</td><td><a href="` +
          (folderUp !== "" ? folderUp : "/") +
          `">..</a></td></tr>`
        : ""
    folderContent.forEach((file) => {
      contentBody =
        contentBody +
        "<tr><td>" +
        (isFolder(requestedPath + "/" + file) ? "[DIR]" : "") +
        '</td><td><a href="' +
        folderName +
        (folderName.endsWith("/") ? "" : "/") +
        file +
        '">' +
        file +
        "</a></td></tr>"
    })

    const contentFooter = `</table><hr></body></html>`

    res.writeHead(200, {
      "Content-Length":
        contentHeader.length + contentBody.length + contentFooter.length,
      "Content-Type": "text/html",
    })
    res.write(contentHeader + contentBody + contentFooter)
    res.end()
    return
  }

  try {
    const filePath = __dirname + decodeURIComponent(requestedFilename)
    const fileExtension = requestedFilename.split(".").pop().toLowerCase()
    const fileSize = fs.statSync(filePath).size
    const fileRange = req.headers.range
      ? req.headers.range.replace(/bytes=/, "").split("-")
      : null
    const fileRangeStart = fileRange ? parseInt(fileRange[0]) : null
    const fileRangeEnd = fileRange
      ? fileRange[1]
        ? parseInt(fileRange[1])
        : Math.min(fileRange[0] + CHUNK_SIZE_IN_MB * 1048576, fileSize - 1)
      : null

    const getMimeType = () => {
      switch (fileExtension) {
        case "html":
          return "text/html"

        case "htm":
          return "text/html"

        case "css":
          return "text/css"

        case "csv":
          return "text/csv"

        case "pdf":
          return "application/pdf"

        case "js":
          return "text/javascript"

        case "json":
          return "application/json"

        case "txt":
          return "text/plain"

        case "md":
          return "text/markdown"

        case "zip":
          return "application/zip"

        case "7z":
          return "application/x-7z-compressed"

        case "rar":
          return "application/x-rar-compressed"

        case "gz":
          return "application/gzip"

        case "epub":
          return "application/epub+zip"

        case "rtf":
          return "application/rtf"

        case "doc":
          return "application/msword"

        case "docx":
          return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        case "xls":
          return "application/vnd.ms-excel"

        case "xlsx":
          return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        case "ppt":
          return "application/vnd.ms-powerpoint"

        case "pptx":
          return "application/vnd.openxmlformats-officedocument.presentationml.presentation"

        case "mp3":
          return "audio/mpeg"

        case "aac":
          return "audio/aac"

        case "flac":
          return "audio/x-flac"

        case "wav":
          return "audio/wav"

        case "ogg":
          return "audio/ogg"

        case "mp4":
          return "video/mp4"

        case "avi":
          return "video/x-msvideo"

        case "3gp":
          return "video/3gpp"

        case "mkv":
          return "video/x-matroska"

        case "mpg":
          return "video/mpeg"

        case "mpeg":
          return "video/mpeg"

        case "ico":
          return "image/vnd.microsoft.icon"

        case "png":
          return "image/png"

        case "jpg":
          return "image/jpeg"

        case "jpeg":
          return "image/jpeg"

        case "gif":
          return "image/gif"

        case "bmp":
          return "image/bmp"

        case "svg":
          return "image/svg+xml"

        default:
          return "application/octet-stream"
      }
    }

    const readStream = fs.createReadStream(
      filePath,
      fileRange ? { start: fileRangeStart, end: fileRangeEnd } : undefined
    )

    if (fileRange) {
      res.writeHead(206, {
        "Content-Range":
          "bytes " + fileRangeStart + "-" + fileRangeEnd + "/" + fileSize,
        "Content-Length": fileRangeEnd - fileRangeStart + 1,
        "Content-Type": getMimeType(),
        "Accept-Ranges": "bytes",
      })
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": getMimeType(),
        "Accept-Ranges": "bytes",
      })
    }

    readStream.pipe(res)
  } catch (err) {
    console.log(err)
    res.writeHead(500, {
      "Content-Length": ERROR_INTERNAL_SERVER_ERROR.length,
      "Content-Type": "text/plain",
    })
    res.write(ERROR_INTERNAL_SERVER_ERROR)
    res.end()
  }
}

console.log("\nServer running.\n")
console.log(
  "Browse to http://localhost" + (serverPort !== 80 ? ":" + serverPort : "") + "\n"
)

try {
  http.createServer(handleRequest).listen(serverPort)
} catch (err) {
  console.log(err)
}
