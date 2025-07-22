let customRegexRules = []
let rendering = false
let history = null
let lastContent = ""
let lastPrompt = ""
let lastHidePrompt = false
let fetchController = null
let replies = []
let selectedReply = 0

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

  lastContent = content.innerHTML
  lastPrompt = prompt
  lastHidePrompt = hidePrompt
  history.push({ type: "user", text: prompt })

  if (!hidePrompt) {
    const promptContainer = createComponent("div", "prompt")
    const promptBackground = createComponent("span", "prompt_background")
    const promptContent = createComponent("div", "prompt_content", "", prompt)

    promptBackground.appendChild(promptContent)
    promptContainer.appendChild(promptBackground)
    content.appendChild(promptContainer)
  }

  let promptResult = null

  if (!hidePrompt) {
    document.querySelector(".action_container")?.remove()

    promptResult = appendMessage(
      "reply",
      '<div id="pointer" class="thinking"></div>'
    )
  } else {
    promptResult =
      document.getElementsByClassName("reply")[
        document.getElementsByClassName("reply").length - 1
      ]
    promptResult.innerHTML = '<div id="pointer" class="thinking"></div>'
  }

  document.title = t("title") + " - " + t("thinking")

  scrollToBottom()

  let reply = ""

  try {
    fetchController = new AbortController()

    const responseAPI = await fetch(window.location.origin + "/ask", {
      method: "POST",
      body: JSON.stringify(history),
      signal: fetchController.signal,
    })

    document.title = t("title") + " - " + t("writing")

    if (responseAPI.ok) {
      const reader = responseAPI.body.getReader()
      const decoder = new TextDecoder()

      const readStream = new Promise((resolve) => {
        const read = () => {
          try {
            reader
              .read()
              .then(({ done, value }) => {
                if (done) {
                  resolve()
                  return
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

                read()
              })
              .catch((err) => {
                reply = ""
                resolve()
              })
          } catch (err) {
            reply = ""
            resolve()
          }
        }
        read()
      })

      await readStream
    }
  } catch (err) {
    console.log(err)
    reply = ""
  }

  handleReply(content, reply, promptResult, prompt)
}

const handleReply = (content, reply, promptResult, prompt) => {
  if (reply === "") {
    reply = t("system_error")
    promptResult.innerHTML = t("system_error")
  }

  history.push({ type: "model", response: [reply] })
  replies.push(reply)
  selectedReply = replies.length
  document.title = t("title")

  document.querySelector(".action_container")?.remove()

  const buttonsContainer = createComponent("div", "action_container")

  const buttonNext = createComponent("button", "action_button")
  buttonNext.type = "button"
  buttonNext.innerHTML = selectedReply + "/" + replies.length
  buttonNext.onclick = () => {
    if (rendering) {
      return
    }

    history.pop()
    history.pop()
    history.push({ type: "user", text: prompt })

    if (!replies[selectedReply + 1]) {
      selectedReply = 0
    } else {
      selectedReply = selectedReply + 1
    }

    buttonNext.innerHTML = selectedReply + 1 + "/" + replies.length

    const newReply = replies[selectedReply]

    history.push({ type: "model", response: [newReply] })

    const resultText = newReply
      .replace(/\</g, "&#60;")
      .trim()
      .replace(/^\),/, "")
      .trim()
    promptResult.innerHTML = markdownToHTML(resultText)
    scrollToBottom()

    const selection = window.getSelection()
    selection.removeAllRanges()

    buttonNext.blur()
  }

  if (replies.length === 1) {
    buttonNext.style.display = "none"
  }

  buttonsContainer.appendChild(buttonNext)

  const buttonRegenerate = createComponent("button", "action_button")
  buttonRegenerate.type = "button"
  buttonRegenerate.innerHTML =
    '<svg class="regenerate" width="24" height="24" viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.76 0 3.39.77 4.54 2.05L14 10h6V4l-2.35 2.35z"/></svg>'
  buttonRegenerate.onclick = () => {
    if (rendering) {
      return
    }

    const buttonNextTemp = document.getElementsByClassName("action_button")[0]
    buttonNextTemp.style.display = "block"
    buttonNextTemp.innerHTML = replies.length + 1 + "/" + (replies.length + 1)

    buttonRegenerate.blur()

    history.pop()
    history.pop()
    ask(prompt, true)
  }

  buttonsContainer.appendChild(buttonRegenerate)

  content.appendChild(buttonsContainer)

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

const isUsingiOS = () => {
  return !!(
    window.navigator.userAgent.match(/iPhone/i) ||
    window.navigator.userAgent.match(/iPad/i) ||
    window.navigator.userAgent.match(/iPod/i)
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

window.addEventListener("blur", () => {
  // Workaround for iOS. iOS kills all the promises after 5 seconds
  // when moving Safari to the background. Thank you iOS.
  if (isUsingiOS() && rendering) {
    if (fetchController) {
      fetchController.abort()
    }

    setTimeout(() => {
      // Sometimes after Safari kills all the promises, fetchController.abort doesn't
      // have enough time to call the handleReply function. So I need to check if
      // the pointer is rendered and if that's the case, calling the function that
      // shows the error message. Thank you again iOS.
      if (document.getElementById("pointer")) {
        const content = document.getElementById("content")
        const replyCounter = document.getElementsByClassName("reply").length - 1
        const lastReply = document.getElementsByClassName("reply")[replyCounter]
        handleReply(content, "", lastReply, lastPrompt, lastHidePrompt)
      }
    }, 200)
  }
})

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
          replies = []
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
