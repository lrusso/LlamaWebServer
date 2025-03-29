const lang = window.navigator.language.substring(0, 2).toLowerCase()

let STRING_TITLE = ""
let STRING_THINKING = ""
let STRING_WRITING = ""
let STRING_SYSTEM_PROMPT = ""
let STRING_WELCOME = ""
let STRING_REGENERATE = ""
let STRING_PLACEHOLDER = ""
let STRING_SYSTEM_ERROR = ""

if (lang === "es") {
  STRING_TITLE = "Llama"
  STRING_THINKING = "Pensando..."
  STRING_WRITING = "Escribiendo..."
  STRING_SYSTEM_PROMPT = "Eres un eficiente asistente AI."
  STRING_WELCOME =
    String.fromCharCode(191) +
    "Con qu" +
    String.fromCharCode(233) +
    " puedo ayudarte?"
  STRING_REGENERATE = "REGENERAR"
  STRING_PLACEHOLDER = "Escribe un mensaje"
  STRING_SYSTEM_ERROR = "Error del sistema. Por favor intente de nuevo."
} else {
  STRING_TITLE = "Llama"
  STRING_THINKING = "Thinking..."
  STRING_WRITING = "Writing..."
  STRING_SYSTEM_PROMPT = "You are a useful AI assistant."
  STRING_WELCOME = "How can I help you today?"
  STRING_REGENERATE = "REGENERATE"
  STRING_PLACEHOLDER = "Write a message"
  STRING_SYSTEM_ERROR = "System error. Please try again."
}

let rendering = false
let history = [
  {
    type: "system",
    text: STRING_SYSTEM_PROMPT,
  },
]
let lastContent = ""

const ask = async (prompt) => {
  prompt = prompt.trim()

  rendering = true

  if (document.getElementsByClassName("action_button")[0]) {
    document.getElementsByClassName("action_button")[0].remove()
  }

  lastContent = document.getElementById("content").innerHTML

  history.push({
    type: "user",
    text: prompt,
  })

  const promptContainer = document.createElement("div")
  promptContainer.className = "prompt"
  const promptSpan = document.createElement("span")
  promptSpan.className = "prompt_background"
  promptSpan.innerText = prompt
  promptContainer.append(promptSpan)
  document.getElementById("content").appendChild(promptContainer)

  const promptResult = document.createElement("span")
  promptResult.className = "reply"
  promptResult.innerHTML = '<div id="pointer" class="moving"></div>'
  document.getElementById("content").appendChild(promptResult)

  document.title = STRING_TITLE + " - " + STRING_THINKING

  setTimeout(() => {
    document
      .getElementById("content")
      .scrollTo(0, document.getElementById("content").scrollHeight)
  }, 100)

  let reply = ""

  try {
    const responseAPI = await fetch("./ask", {
      method: "POST",
      body: JSON.stringify(history),
    })

    document.title = STRING_TITLE + " - " + STRING_WRITING

    const reader = responseAPI.body.getReader()
    const decoder = new TextDecoder()

    reply = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      const newText = decoder.decode(value)
      reply = reply + newText

      const resultText = reply
        .replace(/\</g, "&#60;")
        .trim()
        .replace(/^\),/, "")
        .trim()
      promptResult.innerHTML =
        markdownToHTML(resultText) + '<div id="pointer"></div>'
      scrollToBottom()
    }
  } catch (err) {
    console.log(err)
    reply = STRING_SYSTEM_ERROR
    promptResult.innerHTML = STRING_SYSTEM_ERROR
    scrollToBottom()
  }

  history.push({
    type: "model",
    response: [reply],
  })

  document.title = STRING_TITLE

  const buttonAction = document.createElement("input")
  buttonAction.className = "action_button"
  buttonAction.type = "button"
  buttonAction.value = STRING_REGENERATE
  buttonAction.onclick = () => {
    document.getElementById("content").innerHTML = lastContent
    history.pop()
    history.pop()
    ask(prompt)
  }
  document.getElementById("content").appendChild(buttonAction)

  scrollToBottom()

  if (document.getElementById("pointer")) {
    document.getElementById("pointer").remove()
  }

  setTimeout(() => {
    rendering = false
    if (!isMobileDevice()) {
      document.getElementById("inputbox").focus()
    }
  }, 250)
}

const scrollToBottom = () => {
  if (
    document.getElementById("content").scrollTop >
    document.getElementById("content").scrollHeight -
      document.getElementById("content").offsetHeight -
      70
  ) {
    setTimeout(() => {
      document
        .getElementById("content")
        .scrollTo(0, document.getElementById("content").scrollHeight)
    }, 100)
  }
}

const markdownToHTML = (markdown) => {
  const codeBlocks = []

  // STORING AND REMOVING ALL THE CODE BLOCKS
  markdown = markdown.replace(/\`\`\`.*?\n([\s\S]*?)\`\`\`/g, (match, group) => {
    codeBlocks.push(group)
    return "%%CODELLAMABLOCK" + (codeBlocks.length - 1) + "%%"
  })

  // SETTING THE MARKDOWN RULES
  const rules = [
    { regex: /\*\*(.*?)\*\*/g, replacement: "<strong>$1</strong>" },
    { regex: /\*(.*?)\*/g, replacement: "<em>$1</em>" },
    { regex: /__(.*?)__/g, replacement: "<strong>$1</strong>" },
    { regex: /_(.*?)_/g, replacement: "<em>$1</em>" },
    { regex: /\[(.*?)\]\((.*?)\)/g, replacement: '<a href="$2">$1</a>' },
    { regex: /`(.*?)`/g, replacement: '<div class="highlighted">$1</div>' },
    {
      regex: /^(#{1,6})\s*(.*)$/gm,
      replacement: (match, hashes, content) =>
        "<h" + hashes.length + ">" + content + "</h" + hashes.length + ">",
    },
    { regex: /^[\*\-\+] (.+)$/gm, replacement: (match, item) => "&#8226; " + item },
  ]

  // APPLYING THE MARKDOWN RULES
  rules.forEach(({ regex, replacement }) => {
    markdown = markdown.replace(regex, replacement)
  })

  // RESTORING ALL THE CODE BLOCKS
  markdown = markdown.replace(/%%CODELLAMABLOCK(\d+)%%/g, (match, index) => {
    return "<code>" + codeBlocks[index].replace(/```/g, "") + "</code>"
  })

  return markdown
}

const isMobileDevice = () => {
  return !!(
    window.navigator.userAgent.match(/Android/i) ||
    window.navigator.userAgent.match(/webOS/i) ||
    window.navigator.userAgent.match(/iPhone/i) ||
    window.navigator.userAgent.match(/iPad/i) ||
    window.navigator.userAgent.match(/iPod/i) ||
    window.navigator.userAgent.match(/BlackBerry/i) ||
    window.navigator.userAgent.match(/Windows Phone/i)
  )
}

window.addEventListener("load", () => {
  if (window.top === window.self) {
    document.getElementById("content").innerHTML = ""
    document.getElementById("inputbox").placeholder = STRING_PLACEHOLDER
    document.getElementById("inputbox").disabled = true
    document.getElementById("inputbox").value = ""
    document.getElementById("inputbox").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault()
      }
    })
    document.getElementById("inputbox").addEventListener("keyup", (event) => {
      if (event.key === "Enter") {
        event.preventDefault()
        const textValue = document.getElementById("inputbox").value.trim()
        if (textValue !== "" && !rendering) {
          document.getElementById("inputbox").value = ""
          ask(textValue)
        }
      }
    })

    const currentURL = new URL(window.location.href).searchParams
    const requiredLightMode = currentURL.has("lightmode")
    const requiredDarkMode = currentURL.has("darkmode")

    if (requiredLightMode) {
      const styleNode = document.createElement("style")
      const styleTextNode = document.createTextNode(STYLES_LIGHT_MODE)
      styleNode.appendChild(styleTextNode)
      document.getElementsByTagName("head")[0].appendChild(styleNode)
    } else if (requiredDarkMode) {
      const styleNode = document.createElement("style")
      const styleTextNode = document.createTextNode(STYLES_DARK_MODE)
      styleNode.appendChild(styleTextNode)
      document.getElementsByTagName("head")[0].appendChild(styleNode)
    } else {
      const styleNode = document.createElement("style")
      const styleTextNode = document.createTextNode(STYLES_ALL)
      styleNode.appendChild(styleTextNode)
      document.getElementsByTagName("head")[0].appendChild(styleNode)
    }

    document.getElementsByClassName("agent_name")[0].innerText = STRING_TITLE

    document.getElementById("content").innerHTML = ""
    document.getElementById("inputbox").disabled = false

    const welcomeMessage = document.createElement("span")
    welcomeMessage.className = "reply"
    welcomeMessage.innerText = STRING_WELCOME
    document.getElementById("content").appendChild(welcomeMessage)

    if (!isMobileDevice()) {
      document.getElementById("inputbox").focus()
    }

    document.getElementsByTagName("body")[0].style.opacity = 1
  }
})
