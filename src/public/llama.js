let customRegexRules = []
let rendering = false
let history = null
let lastContent = ""

const createComponent = (tag, className = "", innerHTML = "", innerText) => {
  const element = document.createElement(tag)
  element.className = className
  element.innerHTML = innerHTML
  if (innerText) {
    element.innerText = innerText
  }
  return element
}

const appendMessage = (className, innerHTML) => {
  const container = document.getElementById("content")
  const message = createComponent("span", className, innerHTML)
  container.appendChild(message)
  return message
}

const ask = async (prompt, hidePrompt) => {
  const content = document.getElementById("content")
  const inputbox = document.getElementById("inputbox")

  prompt = prompt.trim()

  if (isMobileDevice()) {
    inputbox.blur()
  }

  rendering = true

  document.querySelector(".action_button")?.remove()

  lastContent = content.innerHTML
  history.push({ type: "user", text: prompt })

  if (!hidePrompt) {
    const promptContainer = createComponent("div", "prompt")
    const promptBackground = createComponent("span", "prompt_background")
    const promptContent = createComponent("div", "prompt_content", "", prompt)

    promptBackground.appendChild(promptContent)
    promptContainer.appendChild(promptBackground)
    content.appendChild(promptContainer)
  }

  const promptResult = appendMessage(
    "reply",
    '<div id="pointer" class="thinking"></div>'
  )
  document.title = t("title") + " - " + t("thinking")

  scrollToBottom()

  let reply = ""

  try {
    const responseAPI = await fetch(window.location.origin + "/ask", {
      method: "POST",
      body: JSON.stringify(history),
    })

    document.title = t("title") + " - " + t("writing")

    const reader = responseAPI.body.getReader()
    const decoder = new TextDecoder()

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
    reply = t("system_error")
    promptResult.innerHTML = t("system_error")
    scrollToBottom()
  }

  if (reply === "") {
    promptResult.innerHTML = "&nbsp;"
  }

  history.push({ type: "model", response: [reply] })
  document.title = t("title")

  const buttonAction = createComponent("button", "action_button")
  buttonAction.type = "button"
  buttonAction.innerHTML =
    '<svg class="regenerate" width="24" height="24" viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.76 0 3.39.77 4.54 2.05L14 10h6V4l-2.35 2.35z"/></svg>'
  buttonAction.onclick = () => {
    content.innerHTML = lastContent
    history.pop()
    history.pop()
    ask(prompt, hidePrompt)
  }
  content.appendChild(buttonAction)

  scrollToBottom()

  document.getElementById("pointer")?.remove()

  setTimeout(() => {
    rendering = false
    if (!isMobileDevice()) {
      inputbox.focus()
    }
  }, 250)
}

const scrollToBottom = () => {
  const totalHeight = document.documentElement.scrollHeight
  const viewportHeight = window.innerHeight
  const scrollYPosition = window.scrollY
  const pixelsLeft = totalHeight - (scrollYPosition + viewportHeight)
  const finalDistance = Math.max(0, pixelsLeft)

  if (finalDistance > 0) {
    window.scrollTo({
      top: document.body.scrollHeight,
    })
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
  let rules = [
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

  rules = rules.concat(customRegexRules)

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

const getLineHeight = (element) => {
  return parseFloat(window.getComputedStyle(element).fontSize)
}

const resizeInputText = () => {
  try {
    const inputbox = document.getElementById("inputbox")
    const inputBackground = document.querySelector(".input_background")

    inputbox.rows = 1
    inputbox.style.height = "auto"
    inputBackground.style.height = "auto"

    const scrollHeight = inputbox.scrollHeight

    if (scrollHeight > inputbox.clientHeight) {
      let newRows = Math.floor(scrollHeight / getLineHeight(inputbox))
      newRows = Math.min(newRows, 5)
      inputbox.rows = newRows

      inputBackground.style.height = inputbox.clientHeight + "px"
    } else {
      inputBackground.style.height = "auto"
    }

    scrollToBottom()
  } catch (err) {
    //
  }
}

window.addEventListener("load", async () => {
  if (window.top === window.self) {
    const inputbox = document.getElementById("inputbox")
    const content = document.getElementById("content")
    const headerName = document.querySelector(".header_name")
    const inputWrapper = document.querySelector(".input_wrapper")
    const inputBackground = document.querySelector(".input_background")

    headerName.innerText = t("title")
    content.innerHTML = ""

    inputbox.placeholder = t("placeholder")
    inputbox.disabled = false
    inputbox.value = ""
    inputbox.addEventListener("input", resizeInputText)
    inputbox.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault()
      }
    })
    inputbox.addEventListener("keyup", (event) => {
      if (event.key === "Enter") {
        event.preventDefault()
        const textValue = inputbox.value.trim()
        if (textValue !== "" && !rendering) {
          inputbox.value = ""
          ask(textValue)
          resizeInputText()
        }
      }
    })

    inputBackground.addEventListener("click", () => {
      inputbox.focus()
    })
    inputWrapper.style.display = "flex"

    const currentURL = new URL(window.location.href).searchParams
    const requiredLightMode = currentURL.has("lightmode")
    const requiredDarkMode = currentURL.has("darkmode")

    const styleNode = document.createElement("style")
    if (requiredLightMode) {
      styleNode.appendChild(document.createTextNode(STYLES_LIGHT_MODE))
    } else if (requiredDarkMode) {
      styleNode.appendChild(document.createTextNode(STYLES_DARK_MODE))
    } else {
      styleNode.appendChild(document.createTextNode(STYLES_ALL))
    }
    document.head.appendChild(styleNode)

    history = [{ type: "system", text: t("system_prompt") }]

    appendMessage("reply", t("system_welcome"))

    if (!isMobileDevice()) {
      inputbox.focus()
    }

    document.body.style.display = "block"
  }
})
