import { getLlama, LlamaChatSession } from "node-llama-cpp"
import { fileURLToPath } from "url"
import { dirname } from "path"
import http from "http"
import fs from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const ROOT_FOLDER = "/public"
const ERROR_INTERNAL_SERVER_ERROR = "Internal Server Error"

const CHUNK_SIZE_IN_MB = 10

const args = process.argv?.slice(2)
const serverPort = args.length > 0 ? args[0] : 80

const modelFilename = fs
  .readdirSync(__dirname + "/model/")
  .find((archivo) => archivo.endsWith(".gguf"))

if (!modelFilename) {
  console.log("Error: Please put a GGUF file in the model folder.")
  process.exit(1)
}

const llama = await getLlama()
const model = await llama.loadModel({
  modelPath: __dirname + "/model/" + modelFilename,
})

const askLlama = async (req, res) => {
  let body = ""
  req.on("data", (chunk) => {
    body = body + chunk.toString()
  })
  req.on("end", async () => {
    try {
      const chatHistory = JSON.parse(body)
      const context = await model.createContext()
      const session = new LlamaChatSession({
        contextSequence: context.getSequence(),
        systemPrompt: chatHistory[0].content,
      })

      session.setChatHistory(chatHistory)

      res.writeHead(200, {
        "Content-Type": "text/plain",
      })

      let reply = ""
      const abortController = new AbortController()

      await session.prompt(chatHistory[chatHistory.length - 1].content, {
        temperature: 0.2,
        signal: abortController.signal,
        onTextChunk(chunk) {
          res.write(chunk)
          reply = reply + chunk
          if (reply.length > 100) {
            const toFind = reply.substring(reply.length - 30, reply.length)
            const repeatedText = reply.split(toFind).length - 1
            if (repeatedText > 4) {
              abortController.abort()
            }
          }
        },
      })

      res.end()

      session.dispose()
      context.dispose()
    } catch (err) {
      res.write("")
      res.end()
    }
  })
}

const handleRequest = async (req, res) => {
  const baseURL =
    (req.protocol ? req.protocol : "http") + "://" + req.headers.host + "/"
  const reqUrl = new URL(req.url, baseURL)

  if (req.url === "/ask") {
    askLlama(req, res)
    return
  }

  // IF THERE IS NO FILENAME IN THE URL, USING THE DEFAULT FILENAME
  let fileName =
    reqUrl.pathname === "/" ? ROOT_FOLDER : ROOT_FOLDER + reqUrl.pathname

  // PREVENTING TO BROWSE TO A URL THAT ENDS WITH A SLASH
  if (fileName.substring(fileName.length - 1, fileName.length) === "/") {
    const normalizedURL = fileName.substring(ROOT_FOLDER.length, fileName.length - 1)

    res.writeHead(302, {
      Location: normalizedURL,
    })
    res.end()
    return
  }

  // IF PATH/INDEX.HTML EXISTS, IT WILL BE READ
  if (fs.existsSync(__dirname + fileName + "/index.html")) {
    fileName = fileName + "/index.html"
  }

  const requestedPath = __dirname + decodeURIComponent(fileName)

  if (!fs.existsSync(requestedPath)) {
    res.writeHead(302, {
      Location: "./",
    })
    res.end()
    return
  }

  if (fs.lstatSync(requestedPath).isDirectory()) {
    const folderName = decodeURIComponent(fileName).substring(
      ROOT_FOLDER.length,
      decodeURIComponent(fileName).length
    )
    const folderUp = folderName.substring(0, folderName.lastIndexOf("/"))
    const folderContent = fs.readdirSync(requestedPath).sort((a, b) => {
      const aIsDir = fs.statSync(requestedPath + "/" + a).isDirectory(),
        bIsDir = fs.statSync(requestedPath + "/" + b).isDirectory()
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
      fileName !== ROOT_FOLDER
        ? `<tr><td>[DIR]</td><td><a href="` +
          (folderUp !== "" ? folderUp : "/") +
          `">..</a></td></tr>`
        : ""
    folderContent.forEach((file) => {
      contentBody =
        contentBody +
        "<tr><td>" +
        (fs.lstatSync(requestedPath + "/" + file).isDirectory() ? "[DIR]" : "") +
        '</td><td><a href="' +
        folderName +
        "/" +
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
    const filePath = __dirname + decodeURIComponent(fileName)
    const fileExtension = fileName.split(".").pop().toLowerCase()
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

try {
  http.createServer(handleRequest).listen(serverPort)
} catch (err) {
  console.log(err)
}
