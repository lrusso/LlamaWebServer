import {
  getLlama,
  LlamaChatSession,
  HarmonyChatWrapper,
  GgufArchitectureType,
  LlamaLogLevel,
} from "node-llama-cpp"
import { TaskQueue } from "./taskQueue.js"
import { fileURLToPath } from "url"
import { dirname, join, sep } from "path"
import http from "http"
import fs from "fs"
import os from "os"

const MODEL_CONTEXT_SIZE = "auto" // "auto", 4096, 8192, 16384, 32768, 65536, 131072

const taskQueue = new TaskQueue()
taskQueue.on("error", (err) => console.log("ERROR: " + err.message))

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const ROOT_FOLDER = "/public"
const PUBLIC_FOLDER = join(__dirname, ROOT_FOLDER)
const ERROR_INTERNAL_SERVER_ERROR = "Internal Server Error"

const CHUNK_SIZE_IN_MB = 10

const args = process.argv?.slice(2)
const serverPort = args.length > 0 ? args[0] : 80

// a port that isn't a number (e.g. "abc" would be taken as the name of a socket
// file) or that is out of range can't be used
if (!/^\d+$/.test(serverPort) || serverPort < 1 || serverPort > 65535) {
  console.log("\nError: Port " + serverPort + " is not valid.\n")
  console.log("Please choose a port between 1 and 65535.\n")
  process.exit(0)
}

const modelFiles = fs
  .readdirSync(__dirname + "/model/")
  .filter((file) => file.toLowerCase().endsWith(".gguf"))

const modelFilename = modelFiles[0]
const countGGUFFiles = modelFiles.length

if (!modelFilename) {
  console.log("Error: Please put a GGUF file in the model folder.")
  process.exit(0)
}

if (countGGUFFiles > 1) {
  console.log("Error: You can have only 1 GGUF file in the model folder.")
  process.exit(0)
}

const showServerError = (err) => {
  if (err.code === "EADDRINUSE") {
    console.log("\nError: Port " + serverPort + " is already in use.\n")
    console.log(
      "Please close the application using that port or choose a different port.\n"
    )
  } else if (err.code === "EACCES") {
    // on linux, the ports below 1024 (such as 80) require administrator privileges
    console.log(
      "\nError: Port " + serverPort + " requires administrator privileges.\n"
    )
    console.log(
      "Please run the server as administrator or choose a port above 1023.\n"
    )
  } else {
    console.log(err)
  }
  process.exit(0)
}

const getNetworkAddresses = () => {
  // the ipv4 addresses of this computer in its local networks (e.g. wi-fi)
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((address) => address.family === "IPv4" && !address.internal)
    .map((address) => address.address)
}

// the port is checked before loading the model, so a port that can't be used is
// reported right away and not after the model is loaded
await new Promise((resolve) => {
  const portCheck = http.createServer()
  portCheck.on("error", showServerError)
  portCheck.listen(serverPort, () => portCheck.close(resolve))
})

console.log("Loading AI model, please wait...")

const llama = await getLlama({
  logLevel: LlamaLogLevel.error,
})

let model = null
try {
  model = await llama.loadModel({
    modelPath: __dirname + "/model/" + modelFilename,
  })
} catch (err) {
  // e.g. a damaged file, a model that this version of llama.cpp doesn't support
  // or not enough memory
  console.log("\nError: The " + modelFilename + " file couldn't be loaded.\n")
  console.log(err.message + "\n")
  process.exit(0)
}
const modelArchitecture = model.fileInfo.metadata?.general?.architecture
const isGptOssModel = modelArchitecture === GgufArchitectureType.gptOss

const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

const getContext = async (retry = 0) => {
  let context = null
  try {
    context = await model.createContext({ contextSize: MODEL_CONTEXT_SIZE })
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
    // checking if the user closed the window
    if (req.socket.destroyed) {
      return
    }

    // the reply stops being generated when the user closes or reloads the page
    const promptController = new AbortController()
    res.on("close", () => promptController.abort())

    let body = ""

    // decoding as utf-8, so a character split between two chunks stays whole
    req.setEncoding("utf8")
    req.on("data", (chunk) => {
      // after a chat too big got its empty reply, the rest of it is ignored
      if (res.writableEnded) {
        return
      }

      try {
        body = body + chunk.toString()
      } catch (err) {
        // a chat too big to fit in a string (a RangeError) gets an empty reply
        body = ""
        res.end()
      }
    })

    // waiting for all data to be received, for the user to close the window or
    // for the empty reply of a chat too big
    await new Promise((resolve) => {
      req.on("end", resolve)
      req.on("close", resolve)
      res.on("close", resolve)
    })

    // the user closed the window before the whole chat was received
    if (!req.complete) {
      return
    }

    // a chat too big to fit in a string already got its empty reply
    if (res.writableEnded) {
      return
    }

    let context
    let session

    try {
      const chatHistory = JSON.parse(body)
      const userPrompt = chatHistory.pop().text
      context = await getContext()

      if (isGptOssModel) {
        session = new LlamaChatSession({
          contextSequence: context.getSequence(),
          chatWrapper: new HarmonyChatWrapper({
            reasoningEffort: "high",
          }),
        })
      } else {
        // any llama model
        session = new LlamaChatSession({
          contextSequence: context.getSequence(),
          systemPrompt: chatHistory[0].text,
        })
      }

      session.setChatHistory(chatHistory)

      res.writeHead(200, {
        "Content-Type": "text/plain",
      })

      let reply = ""

      await session.prompt(userPrompt, {
        temperature: 0.8,
        topP: 0.9,
        topK: 40,
        signal: promptController.signal,
        stopOnAbortSignal: true,
        async onResponseChunk({ segmentType, text }) {
          if (segmentType || !text) {
            return
          }

          res.write(text)
          reply = reply + text

          if (reply.length > 100) {
            const toFind = reply.substring(reply.length - 30, reply.length)
            const repeatedText = reply.split(toFind).length - 1
            if (repeatedText > 10) {
              promptController.abort()
            }
          }
        },
      })
    } catch (err) {
      if (err.message !== "Object is disposed" && !promptController.signal.aborted) {
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

const getLocalPath = (pathname) => {
  try {
    const localPath = join(PUBLIC_FOLDER, decodeURIComponent(pathname))

    // paths outside the public folder (e.g. an encoded "../") are not served
    return (localPath + sep).startsWith(PUBLIC_FOLDER + sep) ? localPath : null
  } catch (err) {
    // malformed urls (e.g. a lone "%") can't be decoded
    return null
  }
}

const encodePath = (path) => {
  // each part of the path is encoded, so the names with "#", "?", "%" or
  // spaces still work as links
  return path.split("/").map(encodeURIComponent).join("/")
}

const escapeHTML = (text) => {
  // the names are shown as text, so a name like <b>hola.txt isn't taken as html
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

const isNotModified = (req, filePath) => {
  // the browser asks if the file changed since the date it already has (the
  // dates of the headers have no milliseconds, so the file is compared without them)
  const modified = Math.floor(fs.statSync(filePath).mtimeMs / 1000) * 1000
  return modified <= Date.parse(req.headers["if-modified-since"])
}

const isSameOrigin = (req) => {
  // the requests without an origin (e.g. curl) are not sent by a page, so they
  // can't come from another site
  if (!req.headers.origin) {
    return true
  }

  try {
    return new URL(req.headers.origin).host === req.headers.host
  } catch (err) {
    // an origin that isn't a url (e.g. "null") is not this server
    return false
  }
}

const handleRequest = (req, res) => {
  const baseURL =
    (req.protocol ? req.protocol : "http") + "://" + req.headers.host + "/"
  let reqUrl = null
  try {
    reqUrl = new URL(req.url, baseURL)
  } catch (err) {
    // the urls that can't be parsed (e.g. "//" or a wrong host) are handled as
    // a missing file
    res.writeHead(302, {
      Location: baseURL,
    })
    res.end()
    return
  }

  // only the chat page of this server can ask, so a page from another site
  // can't make the model generate and gets an empty reply
  if (req.url === "/ask" && req.method === "POST") {
    if (isSameOrigin(req)) {
      askLlama(req, res)
    } else {
      res.end()
    }
    return
  }

  const requestedFilename =
    reqUrl.pathname === "/" ? ROOT_FOLDER : ROOT_FOLDER + reqUrl.pathname
  const requestedPath = getLocalPath(reqUrl.pathname)

  if (!requestedPath || !fs.existsSync(requestedPath)) {
    res.writeHead(302, {
      Location: baseURL,
    })
    res.end()
    return
  }

  const indexPath = requestedPath + "/index.html"
  const rootIndexPath = PUBLIC_FOLDER + "/index.html"

  if (reqUrl.pathname === "/" && isFile(rootIndexPath)) {
    const filePath = rootIndexPath
    const fileSize = fs.statSync(filePath).size

    // the browser already has this version of the file
    if (isNotModified(req, filePath)) {
      res.writeHead(304)
      res.end()
      return
    }
    const readStream = fs.createReadStream(filePath)

    // a file that can't be read closes the connection instead of the server
    readStream.on("error", () => res.destroy())

    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "text/html; charset=utf-8",
      "Accept-Ranges": "bytes",
      "Last-Modified": fs.statSync(filePath).mtime.toUTCString(),
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

    // the browser already has this version of the file
    if (isNotModified(req, filePath)) {
      res.writeHead(304)
      res.end()
      return
    }
    const readStream = fs.createReadStream(filePath)
    readStream.on("error", () => res.destroy())
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "text/html; charset=utf-8",
      "Accept-Ranges": "bytes",
      "Last-Modified": fs.statSync(filePath).mtime.toUTCString(),
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

  // a folder without an index.html is listed without the trailing slash (the
  // root is the exception, since its url always ends with a slash)
  if (
    isFolder(requestedPath) &&
    !isFile(indexPath) &&
    reqUrl.pathname.endsWith("/") &&
    reqUrl.pathname !== "/"
  ) {
    res.writeHead(302, {
      Location: reqUrl.pathname.replace(/\/+$/, ""),
    })
    res.end()
    return
  }

  if (isFolder(requestedPath)) {
    let folderFiles = null
    try {
      folderFiles = fs.readdirSync(requestedPath)
    } catch (err) {
      // a folder that can't be read (e.g. without permissions) returns an error
      // instead of closing the server
      res.writeHead(500, {
        "Content-Length": ERROR_INTERNAL_SERVER_ERROR.length,
        "Content-Type": "text/plain",
      })
      res.write(ERROR_INTERNAL_SERVER_ERROR)
      res.end()
      return
    }

    const folderName = decodeURIComponent(requestedFilename).substring(
      ROOT_FOLDER.length,
      decodeURIComponent(requestedFilename).length
    )
    const folderUp = folderName.substring(0, folderName.lastIndexOf("/"))
    const folderContent = folderFiles.sort((a, b) => {
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
      (folderName !== "" ? escapeHTML(folderName) : "/") +
      `</title></head><body><h1>Index of ` +
      (folderName !== "" ? escapeHTML(folderName) : "/") +
      `</h1><hr><table>`

    let contentBody =
      requestedFilename !== ROOT_FOLDER
        ? `<tr><td>[DIR]</td><td><a href="` +
          (folderUp !== "" ? encodePath(folderUp) : "/") +
          `">..</a></td></tr>`
        : ""
    folderContent.forEach((file) => {
      contentBody =
        contentBody +
        "<tr><td>" +
        (isFolder(requestedPath + "/" + file) ? "[DIR]" : "") +
        '</td><td><a href="' +
        encodePath(folderName + (folderName.endsWith("/") ? "" : "/") + file) +
        '">' +
        escapeHTML(file) +
        "</a></td></tr>"
    })

    const contentFooter = `</table><hr></body></html>`

    // the length is in bytes, so the names with accents aren't cut
    res.writeHead(200, {
      "Content-Length": Buffer.byteLength(
        contentHeader + contentBody + contentFooter
      ),
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

    // the browser already has this version of the file
    if (isNotModified(req, filePath)) {
      res.writeHead(304)
      res.end()
      return
    }
    // only the byte ranges are supported, a range in any other unit is ignored
    const fileRange =
      req.headers.range && req.headers.range.startsWith("bytes=")
        ? req.headers.range.replace(/bytes=/, "").split("-")
        : null
    let fileRangeStart = fileRange ? parseInt(fileRange[0]) : null
    let fileRangeEnd = fileRange
      ? fileRange[1]
        ? parseInt(fileRange[1])
        : Math.min(fileRange[0] + CHUNK_SIZE_IN_MB * 1048576, fileSize - 1)
      : null

    // a range without its start (e.g. bytes=-500) asks for the last bytes
    if (fileRange && fileRange[0] === "") {
      fileRangeStart = Math.max(fileSize - parseInt(fileRange[1]), 0)
      fileRangeEnd = fileSize - 1
    }

    // a range that goes past the end of the file stops at its last byte
    if (fileRangeEnd > fileSize - 1) {
      fileRangeEnd = fileSize - 1
    }

    // a range that can't be served (e.g. starting after the end of the file)
    if (fileRange && !(fileRangeStart <= fileRangeEnd)) {
      res.writeHead(416, {
        "Content-Range": "bytes */" + fileSize,
      })
      res.end()
      return
    }

    // the text files are sent as utf-8, so their accents are not shown garbled
    const getMimeType = () => {
      switch (fileExtension) {
        case "html":
          return "text/html; charset=utf-8"

        case "htm":
          return "text/html; charset=utf-8"

        case "xhtml":
          return "application/xhtml+xml"

        case "css":
          return "text/css; charset=utf-8"

        case "csv":
          return "text/csv; charset=utf-8"

        case "tsv":
          return "text/tab-separated-values; charset=utf-8"

        case "pdf":
          return "application/pdf"

        case "js":
          return "text/javascript; charset=utf-8"

        case "mjs":
          return "text/javascript; charset=utf-8"

        case "cjs":
          return "text/javascript; charset=utf-8"

        case "wasm":
          return "application/wasm"

        case "json":
          return "application/json"

        case "jsonld":
          return "application/ld+json"

        case "map":
          return "application/json"

        case "webmanifest":
          return "application/manifest+json"

        case "xml":
          return "application/xml"

        case "xsl":
          return "application/xslt+xml"

        case "rss":
          return "application/rss+xml"

        case "atom":
          return "application/atom+xml"

        case "yaml":
          return "application/yaml"

        case "yml":
          return "application/yaml"

        case "toml":
          return "application/toml"

        case "geojson":
          return "application/geo+json"

        case "gpx":
          return "application/gpx+xml"

        case "kml":
          return "application/vnd.google-earth.kml+xml"

        case "kmz":
          return "application/vnd.google-earth.kmz"

        case "txt":
          return "text/plain; charset=utf-8"

        case "log":
          return "text/plain; charset=utf-8"

        case "ics":
          return "text/calendar; charset=utf-8"

        case "vcf":
          return "text/vcard; charset=utf-8"

        case "vtt":
          return "text/vtt; charset=utf-8"

        case "srt":
          return "application/x-subrip"

        case "py":
          return "text/x-python; charset=utf-8"

        case "c":
          return "text/x-c; charset=utf-8"

        case "h":
          return "text/x-c; charset=utf-8"

        case "cpp":
          return "text/x-c++; charset=utf-8"

        case "java":
          return "text/x-java-source; charset=utf-8"

        case "sh":
          return "application/x-sh"

        case "sql":
          return "application/sql"

        case "tex":
          return "application/x-tex"

        case "md":
          return "text/markdown; charset=utf-8"

        case "markdown":
          return "text/markdown; charset=utf-8"

        case "zip":
          return "application/zip"

        case "tar":
          return "application/x-tar"

        case "tgz":
          return "application/gzip"

        case "bz2":
          return "application/x-bzip2"

        case "xz":
          return "application/x-xz"

        case "zst":
          return "application/zstd"

        case "7z":
          return "application/x-7z-compressed"

        case "rar":
          return "application/x-rar-compressed"

        case "gz":
          return "application/gzip"

        case "epub":
          return "application/epub+zip"

        case "mobi":
          return "application/x-mobipocket-ebook"

        case "azw":
          return "application/vnd.amazon.ebook"

        case "rtf":
          return "application/rtf"

        case "odt":
          return "application/vnd.oasis.opendocument.text"

        case "ods":
          return "application/vnd.oasis.opendocument.spreadsheet"

        case "odp":
          return "application/vnd.oasis.opendocument.presentation"

        case "odg":
          return "application/vnd.oasis.opendocument.graphics"

        case "pages":
          return "application/vnd.apple.pages"

        case "numbers":
          return "application/vnd.apple.numbers"

        case "key":
          return "application/vnd.apple.keynote"

        case "ps":
          return "application/postscript"

        case "eps":
          return "application/postscript"

        case "ai":
          return "application/postscript"

        case "xps":
          return "application/vnd.ms-xpsdocument"

        case "djvu":
          return "image/vnd.djvu"

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

        case "apk":
          return "application/vnd.android.package-archive"

        case "jar":
          return "application/java-archive"

        case "deb":
          return "application/vnd.debian.binary-package"

        case "rpm":
          return "application/x-rpm"

        case "dmg":
          return "application/x-apple-diskimage"

        case "iso":
          return "application/x-iso9660-image"

        case "torrent":
          return "application/x-bittorrent"

        case "crt":
          return "application/x-x509-ca-cert"

        case "mp3":
          return "audio/mpeg"

        case "m4a":
          return "audio/mp4"

        case "opus":
          return "audio/opus"

        case "aac":
          return "audio/aac"

        case "flac":
          return "audio/x-flac"

        case "wav":
          return "audio/wav"

        case "aif":
          return "audio/aiff"

        case "aiff":
          return "audio/aiff"

        case "ogg":
          return "audio/ogg"

        case "oga":
          return "audio/ogg"

        case "weba":
          return "audio/webm"

        case "mid":
          return "audio/midi"

        case "midi":
          return "audio/midi"

        case "amr":
          return "audio/amr"

        case "wma":
          return "audio/x-ms-wma"

        case "mka":
          return "audio/x-matroska"

        case "mp4":
          return "video/mp4"

        case "m4v":
          return "video/mp4"

        case "webm":
          return "video/webm"

        case "mov":
          return "video/quicktime"

        case "ogv":
          return "video/ogg"

        case "avi":
          return "video/x-msvideo"

        case "wmv":
          return "video/x-ms-wmv"

        case "flv":
          return "video/x-flv"

        case "asf":
          return "video/x-ms-asf"

        case "3gp":
          return "video/3gpp"

        case "3g2":
          return "video/3gpp2"

        case "mkv":
          return "video/x-matroska"

        case "ts":
          return "video/mp2t"

        case "m3u8":
          return "application/vnd.apple.mpegurl"

        case "mpd":
          return "application/dash+xml"

        case "mpg":
          return "video/mpeg"

        case "mpeg":
          return "video/mpeg"

        case "ico":
          return "image/vnd.microsoft.icon"

        case "png":
          return "image/png"

        case "apng":
          return "image/apng"

        case "webp":
          return "image/webp"

        case "avif":
          return "image/avif"

        case "jpg":
          return "image/jpeg"

        case "jpeg":
          return "image/jpeg"

        case "jfif":
          return "image/jpeg"

        case "gif":
          return "image/gif"

        case "bmp":
          return "image/bmp"

        case "tif":
          return "image/tiff"

        case "tiff":
          return "image/tiff"

        case "heic":
          return "image/heic"

        case "heif":
          return "image/heif"

        case "jxl":
          return "image/jxl"

        case "psd":
          return "image/vnd.adobe.photoshop"

        case "svg":
          return "image/svg+xml"

        case "woff":
          return "font/woff"

        case "woff2":
          return "font/woff2"

        case "ttf":
          return "font/ttf"

        case "otf":
          return "font/otf"

        case "eot":
          return "application/vnd.ms-fontobject"

        case "glb":
          return "model/gltf-binary"

        case "gltf":
          return "model/gltf+json"

        case "stl":
          return "model/stl"

        case "obj":
          return "model/obj"

        case "usdz":
          return "model/vnd.usdz+zip"

        default:
          return "application/octet-stream"
      }
    }

    const readStream = fs.createReadStream(
      filePath,
      fileRange ? { start: fileRangeStart, end: fileRangeEnd } : undefined
    )
    readStream.on("error", () => res.destroy())

    if (fileRange) {
      res.writeHead(206, {
        "Content-Range":
          "bytes " + fileRangeStart + "-" + fileRangeEnd + "/" + fileSize,
        "Content-Length": fileRangeEnd - fileRangeStart + 1,
        "Content-Type": getMimeType(),
        "Accept-Ranges": "bytes",
        "Last-Modified": fs.statSync(filePath).mtime.toUTCString(),
      })
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": getMimeType(),
        "Accept-Ranges": "bytes",
        "Last-Modified": fs.statSync(filePath).mtime.toUTCString(),
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

const server = http.createServer(handleRequest)

server.on("error", async (err) => {
  await model.dispose()
  await llama.dispose()
  showServerError(err)
})

server.on("listening", () => {
  const port = Number(serverPort) !== 80 ? ":" + serverPort : ""

  // the urls for browsing from this computer and from other devices on the
  // network (e.g. a phone), listed with the same bullet as the chat
  const urls = ["localhost"].concat(getNetworkAddresses()).map((host) => {
    return "\u2022 http://" + host + port
  })

  console.log("\nServer running.\n")
  console.log("Open in your browser:\n\n" + urls.join("\n") + "\n")
})

server.listen(serverPort)
