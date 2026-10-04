let customResponseRegexRules = []
let customPromptRegexRules = []
let customPrefix = ""
let rendering = false
let chatHistory = []
let replies = []
let selectedReply = 0
let toastTimeout = null
let promptBeforeEdit = ""
let fetchController = null
let isFocusEventHandled = false

const ICON_REGENERATE = () => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("class", "regenerate")
  svg.setAttribute("width", "24")
  svg.setAttribute("height", "24")
  svg.setAttribute("viewBox", "0 0 24 24")
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
  path.setAttribute(
    "d",
    "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.76 0 3.39.77 4.54 2.05L14 10h6V4l-2.35 2.35z"
  )
  svg.appendChild(path)
  return svg
}

const ICON_COPY = () => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("class", "copy")
  svg.setAttribute("width", "20")
  svg.setAttribute("height", "20")
  svg.setAttribute("viewBox", "0 0 24 24")
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
  path.setAttribute(
    "d",
    "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
  )
  svg.appendChild(path)
  return svg
}

const ICON_EDIT = () => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("class", "edit")
  svg.setAttribute("width", "24")
  svg.setAttribute("height", "24")
  svg.setAttribute("viewBox", "0 0 24 24")
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
  path.setAttribute(
    "d",
    "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
  )
  svg.appendChild(path)
  return svg
}

const createComponent = (tag, className, innerHTML, innerText) => {
  const element = document.createElement(tag)
  element.className = className || ""
  element.innerHTML = innerHTML || ""
  if (innerText) {
    element.innerText = innerText
  }
  return element
}

const appendMessage = (className, innerHTML) => {
  const content = document.querySelector(".content")
  const message = createComponent("span", className, innerHTML)
  content.appendChild(message)
  return message
}

const showToast = (text) => {
  const toast = document.querySelector(".toast")

  toast.innerText = text
  toast.classList.add("active")

  clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => {
    toast.classList.remove("active")
  }, 2000)
}

const patchDOM = (target, newHTML) => {
  const temp = document.createElement("div")
  temp.innerHTML = newHTML
  reconcileChildren(target, temp)
}

const reconcileChildren = (existing, updated) => {
  const existingChildren = Array.prototype.slice.call(existing.childNodes)
  const updatedChildren = Array.prototype.slice.call(updated.childNodes)

  for (let i = 0; i < updatedChildren.length; i++) {
    if (i < existingChildren.length) {
      reconcileNode(existing, existingChildren[i], updatedChildren[i])
    } else {
      existing.appendChild(updatedChildren[i].cloneNode(true))
    }
  }

  for (let i = existingChildren.length - 1; i >= updatedChildren.length; i--) {
    existing.removeChild(existingChildren[i])
  }
}

const reconcileNode = (parent, existingNode, newNode) => {
  if (
    existingNode.nodeType !== newNode.nodeType ||
    existingNode.nodeName !== newNode.nodeName
  ) {
    parent.replaceChild(newNode.cloneNode(true), existingNode)
    return
  }

  if (existingNode.nodeType === Node.TEXT_NODE) {
    if (existingNode.textContent !== newNode.textContent) {
      existingNode.textContent = newNode.textContent
    }
    return
  }

  if (existingNode.nodeType === Node.ELEMENT_NODE) {
    const existingAttrs = existingNode.attributes
    const newAttrs = newNode.attributes

    for (let i = existingAttrs.length - 1; i >= 0; i--) {
      if (!newNode.hasAttribute(existingAttrs[i].name)) {
        existingNode.removeAttribute(existingAttrs[i].name)
      }
    }

    for (let i = 0; i < newAttrs.length; i++) {
      if (existingNode.getAttribute(newAttrs[i].name) !== newAttrs[i].value) {
        existingNode.setAttribute(newAttrs[i].name, newAttrs[i].value)
      }
    }

    reconcileChildren(existingNode, newNode)
  }
}

const ask = async (prompt, hidePrompt) => {
  const content = document.querySelector(".content")
  const inputTextbox = document.querySelector(".input_textbox")

  prompt = prompt.trim()
  customPrefix = customPrefix.trim()
  customPrefix = customPrefix ? customPrefix + " " : ""

  if (isMobileDevice()) {
    inputTextbox.blur()
  }

  rendering = true

  let formattedPrompt = prompt
  customPromptRegexRules.forEach((rule) => {
    formattedPrompt = formattedPrompt.replace(rule.regex, rule.replacement)
  })

  chatHistory.push({ type: "user", text: customPrefix + formattedPrompt })

  let buttonEdit = document.querySelector(".edit_container button")
  let promptResult = null

  if (!hidePrompt) {
    const promptContainer = createComponent("div", "prompt_container")
    const promptBackground = createComponent("span", "prompt_background")
    const promptContent = createComponent("div", "prompt_content", "", prompt)
    const editContainer = createComponent("div", "edit_container")

    // only the last prompt can be edited
    if (buttonEdit) {
      buttonEdit.parentNode.remove()
    }

    promptContent.addEventListener("keydown", handlePromptKeydown)
    promptContent.addEventListener("blur", handlePromptBlur)

    buttonEdit = createComponent("button", "action_button")
    buttonEdit.type = "button"
    buttonEdit.appendChild(ICON_EDIT())
    buttonEdit.addEventListener("click", editPrompt)

    promptBackground.appendChild(promptContent)
    promptContainer.appendChild(promptBackground)
    editContainer.appendChild(buttonEdit)
    content.appendChild(promptContainer)
    content.appendChild(editContainer)

    const actionsContainer = document.querySelector(".actions_container")
    if (actionsContainer) {
      actionsContainer.remove()
    }

    promptResult = appendMessage("reply", '<div class="pointer"></div>')

    content.scrollTop = content.scrollHeight
  } else {
    promptResult =
      document.getElementsByClassName("reply")[
        document.getElementsByClassName("reply").length - 1
      ]
    const hasOnlyPointer =
      promptResult.children.length === 1 &&
      promptResult.firstElementChild &&
      promptResult.firstElementChild.classList.contains("pointer")
    if (!hasOnlyPointer) {
      while (promptResult.firstChild) {
        promptResult.removeChild(promptResult.firstChild)
      }
      const pointer = document.createElement("div")
      pointer.className = "pointer"
      promptResult.appendChild(pointer)
    }
  }

  // the last prompt can't be edited while the reply is being generated
  buttonEdit.children[0].classList.remove("active")
  buttonEdit.disabled = true
  buttonEdit.style.cursor = "default"

  document.title = t("title") + " - " + t("thinking")

  let reply = ""

  try {
    fetchController = new AbortController()

    const responseAPI = await fetch(window.location.origin + "/ask", {
      method: "POST",
      body: JSON.stringify(chatHistory),
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

                const resultText = reply.replace(/\</g, "&#60;")

                patchDOM(
                  promptResult,
                  markdownToHTML(resultText) + '<div class="pointer"></div>'
                )

                read()
              })
              .catch((_err) => {
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
  const inputTextbox = document.querySelector(".input_textbox")

  if (reply === "") {
    setTimeout(() => {
      // removing the last user prompt and re-asking
      chatHistory.pop()
      ask(prompt, true)
    }, 500)
    return
  }

  chatHistory.push({ type: "model", response: [reply] })
  replies.push(reply)
  selectedReply = replies.length
  document.title = t("title")

  const actionsContainer = document.querySelector(".actions_container")
  if (actionsContainer) {
    actionsContainer.remove()
  }

  const buttonsContainer = createComponent("div", "actions_container")

  const buttonNext = createComponent("button", "action_button")
  const buttonRegenerate = createComponent("button", "action_button")
  const buttonCopy = createComponent("button", "action_button")
  const buttonEdit = document.querySelector(".edit_container button")

  buttonNext.type = "button"
  while (buttonNext.firstChild) {
    buttonNext.removeChild(buttonNext.firstChild)
  }
  buttonNext.appendChild(
    document.createTextNode(selectedReply + "/" + replies.length)
  )
  buttonNext.addEventListener("click", () => {
    if (rendering) {
      return
    }

    if (buttonNext.style.display === "none") {
      return
    }

    chatHistory.pop()
    chatHistory.pop()
    chatHistory.push({ type: "user", text: prompt })

    if (!replies[selectedReply + 1]) {
      selectedReply = 0
    } else {
      selectedReply = selectedReply + 1
    }

    while (buttonNext.firstChild) {
      buttonNext.removeChild(buttonNext.firstChild)
    }
    buttonNext.appendChild(
      document.createTextNode(selectedReply + 1 + "/" + replies.length)
    )

    const newReply = replies[selectedReply]

    chatHistory.push({ type: "model", response: [newReply] })

    const resultText = newReply.replace(/\</g, "&#60;")
    promptResult.innerHTML = markdownToHTML(resultText)

    const selection = window.getSelection()
    selection.removeAllRanges()
  })

  buttonRegenerate.type = "button"
  buttonRegenerate.appendChild(ICON_REGENERATE())
  buttonRegenerate.addEventListener("click", () => {
    if (rendering) {
      return
    }

    buttonNext.style.display = "block"
    buttonNext.disabled = true
    while (buttonNext.firstChild) {
      buttonNext.removeChild(buttonNext.firstChild)
    }
    buttonNext.appendChild(
      document.createTextNode(replies.length + 1 + "/" + (replies.length + 1))
    )
    buttonNext.classList.remove("active")

    buttonRegenerate.children[0].classList.remove("active")
    buttonRegenerate.disabled = true
    buttonRegenerate.style.cursor = "default"

    buttonCopy.children[0].classList.remove("active")
    buttonCopy.disabled = true
    buttonCopy.style.cursor = "default"

    chatHistory.pop()
    chatHistory.pop()
    ask(prompt, true)

    if (!isMobileDevice()) {
      inputTextbox.focus()
    }
  })

  buttonCopy.type = "button"
  buttonCopy.appendChild(ICON_COPY())
  buttonCopy.addEventListener("click", () => {
    if (rendering) {
      return
    }

    const lastReply = document.querySelector(".reply:last-of-type")

    if (navigator.clipboard) {
      // the clipboard api only exists in secure contexts (https or localhost)
      navigator.clipboard.writeText(lastReply.innerText).then(() => {
        showToast(t("copied"))
      })
    } else {
      // legacy copy for the insecure contexts (plain http), where the clipboard
      // api doesn't exist. execCommand copies the current selection, so the
      // reply is selected first and unselected afterwards
      const selection = window.getSelection()
      const range = document.createRange()

      range.selectNodeContents(lastReply)
      selection.removeAllRanges()
      selection.addRange(range)

      try {
        if (document.execCommand("copy")) {
          showToast(t("copied"))
        }
      } catch (err) {
        //
      }

      selection.removeAllRanges()
    }

    if (!isMobileDevice()) {
      buttonCopy.blur()
    }
  })

  if (replies.length === 1) {
    buttonNext.style.display = "none"
  }

  buttonsContainer.appendChild(buttonNext)
  buttonsContainer.appendChild(buttonRegenerate)
  buttonsContainer.appendChild(buttonCopy)

  buttonNext.classList.add("active")
  buttonNext.disabled = false
  buttonRegenerate.children[0].classList.add("active")
  buttonRegenerate.disabled = false
  buttonRegenerate.style.cursor = "pointer"
  buttonCopy.children[0].classList.add("active")
  buttonCopy.disabled = false
  buttonCopy.style.cursor = "pointer"
  buttonEdit.children[0].classList.add("active")
  buttonEdit.disabled = false
  buttonEdit.style.cursor = "pointer"

  content.appendChild(buttonsContainer)

  const pointerElement = document.querySelector(".pointer")
  if (pointerElement) {
    pointerElement.remove()
  }

  rendering = false
}

const editPrompt = () => {
  if (rendering) {
    return
  }

  const prompts = document.querySelectorAll(".prompt_content")
  const promptContent = prompts[prompts.length - 1]
  const selection = window.getSelection()

  promptBeforeEdit = promptContent.innerText
  promptContent.contentEditable = "true"
  promptContent.focus()

  // moving the caret to the end of the prompt
  selection.selectAllChildren(promptContent)
  selection.collapseToEnd()
}

const handlePromptKeydown = (event) => {
  const promptContent = event.currentTarget

  if (event.key === "Escape") {
    promptContent.blur()
  }

  if (event.key === "Enter") {
    event.preventDefault()

    const newPrompt = promptContent.innerText.trim()

    if (rendering || newPrompt === "" || newPrompt === promptBeforeEdit) {
      promptContent.blur()
      return
    }

    const actionsContainer = document.querySelector(".actions_container")

    promptBeforeEdit = newPrompt
    promptContent.blur()

    if (actionsContainer) {
      actionsContainer.remove()
    }

    // replacing the last prompt and removing the last reply
    chatHistory.pop()
    chatHistory.pop()
    replies.splice(0, replies.length)
    ask(newPrompt, true)

    if (!isMobileDevice()) {
      document.querySelector(".input_textbox").focus()
    }
  }
}

const handlePromptBlur = (event) => {
  // leaving the prompt ends the edition and discards the unsent changes
  event.currentTarget.contentEditable = "false"
  event.currentTarget.innerText = promptBeforeEdit
}

const markdownToHTML = (markdown) => {
  const codeBlocks = []

  // storing and removing all the code blocks
  markdown = markdown.replace(/\`\`\`.*?\n([\s\S]*?)\`\`\`/g, (_match, group) => {
    codeBlocks.push(group)
    return "%%CODELLAMABLOCK" + (codeBlocks.length - 1) + "%%"
  })

  // storing and removing all the links (so their urls are not touched by the
  // emphasis rules below, e.g. an underscore inside a url becoming <em>)
  const links = []
  markdown = markdown.replace(/\[(.*?)\]\((.*?)\)/g, (_match, text, url) => {
    links.push('<a href="' + url + '" target="top">' + text + "</a>")
    return "%%CODELLAMALINK" + (links.length - 1) + "%%"
  })

  // parsing markdown tables
  markdown = markdown.replace(
    /^(\|.+\|)\r?\n(\|[-:\s|]+\|)\r?\n((?:\|.+\|\r?\n?)+)/gm,
    (_match, headerRow, _separatorRow, bodyRows) => {
      function parseRow(row) {
        return row
          .split("|")
          .slice(1, -1)
          .map((cell) => {
            return cell.trim()
          })
      }

      const headers = parseRow(headerRow)
      const rows = bodyRows
        .trim()
        .split(/\r?\n/)
        .map((row) => {
          return parseRow(row)
        })

      let html = "<table><thead><tr>"
      headers.forEach((header) => {
        html = html + "<th>" + header + "</th>"
      })
      html = html + "</tr></thead><tbody>"
      rows.forEach((row) => {
        html = html + "<tr>"
        row.forEach((cell) => {
          html = html + "<td>" + cell + "</td>"
        })
        html = html + "</tr>"
      })
      html = html + "</tbody></table>"
      return html
    }
  )

  // setting the markdown rules
  let rules = [
    { regex: /^---$\n?/gm, replacement: "<hr>" },
    { regex: /\*\*(.*?)\*\*/g, replacement: "<strong>$1</strong>" },
    { regex: /\*(.*?)\*/g, replacement: "<em>$1</em>" },
    { regex: /__(.*?)__/g, replacement: "<strong>$1</strong>" },
    { regex: /_(.*?)_/g, replacement: "<em>$1</em>" },
    { regex: /`(.*?)`/g, replacement: '<div class="highlighted">$1</div>' },
    {
      regex: /^(#{1,6})\s*(.*)$/gm,
      replacement: function replacement(_match, hashes, content) {
        return "<h" + hashes.length + ">" + content + "</h" + hashes.length + ">"
      },
    },
    {
      regex: /^[\*\-\+] (.+)$/gm,
      replacement: function replacement(_match, item) {
        return "&#8226; " + item
      },
    },
  ]

  rules = rules.concat(customResponseRegexRules)

  // applying the markdown rules
  rules.forEach((rule) => {
    markdown = markdown.replace(rule.regex, rule.replacement)
  })

  // restoring all the links
  markdown = markdown.replace(/%%CODELLAMALINK(\d+)%%/g, (_match, index) => {
    return links[index]
  })

  // restoring all the code blocks
  markdown = markdown.replace(/%%CODELLAMABLOCK(\d+)%%/g, (_match, index) => {
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
  const fontSize = parseFloat(window.getComputedStyle(element).fontSize)

  const multipliers = {
    desktop: 1.09,
    android: 1.14,
    ios: 1.17,
  }

  if (isMobileDevice()) {
    if (isUsingiOS()) {
      return fontSize * multipliers.ios
    }
    return fontSize * multipliers.android
  }

  return fontSize * multipliers.desktop
}

const resizeInputText = () => {
  try {
    const content = document.querySelector(".content")
    const footerContainer = document.querySelector(".footer_container")
    const inputTextbox = document.querySelector(".input_textbox")

    // checked before resizing, so a user at the bottom stays at the bottom
    const pixelsLeft =
      content.scrollHeight - (content.scrollTop + content.clientHeight)
    const isAtBottom = pixelsLeft <= 1

    inputTextbox.rows = 1
    inputTextbox.style.height = "auto"

    const lineHeight = getLineHeight(inputTextbox)
    const scrollHeight = inputTextbox.scrollHeight

    const correction = inputTextbox.offsetHeight - inputTextbox.clientHeight

    let newHeight = scrollHeight - correction
    const maxHeight = lineHeight * 5

    if (newHeight > maxHeight) {
      newHeight = maxHeight
    }

    inputTextbox.style.height = newHeight + "px"

    // the chat scrolls inside the content, which ends where the footer starts.
    // the window itself never scrolls, because on ios scrolling it while the
    // keyboard is open makes the whole page jump
    content.style.bottom = footerContainer.offsetHeight + "px"

    if (isAtBottom) {
      content.scrollTop = content.scrollHeight
    }
  } catch (err) {
    //
  }
}

const sendPrompt = (prompt) => {
  prompt = prompt.trim()
  if (prompt) {
    replies.splice(0, replies.length)
    ask(prompt)
  }
}

window.addEventListener("focus", () => {
  if (isUsingiOS() && rendering && !isFocusEventHandled) {
    // workaround for ios. ios kills all the network requests in progress
    // after 5 seconds when moving safari to the background. thank you ios.
    if (fetchController) {
      fetchController.abort()
    }
    isFocusEventHandled = true
  }
})

window.addEventListener("blur", () => {
  // workaround for ios. ios kills all the network requests in progress
  // after 5 seconds when moving safari to the background. thank you ios.
  if (isUsingiOS() && rendering) {
    isFocusEventHandled = false

    if (fetchController) {
      fetchController.abort()
    }

    setTimeout(() => {
      // clearing any incomplete response (if any)
      if (document.querySelector(".pointer")) {
        const replyCounter = document.getElementsByClassName("reply").length - 1
        const lastReply = document.getElementsByClassName("reply")[replyCounter]
        const pointer = document.createElement("div")
        pointer.className = "pointer"
        lastReply.appendChild(pointer)
      }
    }, 200)
  }
})

window.addEventListener("load", () => {
  if (window.top === window.self) {
    const pleaseWait = document.querySelector(".pleasewait")
    const container = document.getElementById("container")
    const content = document.querySelector(".content")
    const headerName = document.querySelector(".header_name")
    const inputContainer = document.querySelector(".input_container")
    const inputTextbox = document.querySelector(".input_textbox")
    const inputSend = document.querySelector(".input_send")
    const labelDisclaimer = document.querySelector(".disclaimer")

    document.title = t("title")
    headerName.innerText = t("title")

    while (content.firstChild) {
      content.removeChild(content.firstChild)
    }

    inputTextbox.placeholder = t("placeholder")
    inputTextbox.disabled = false
    inputTextbox.value = ""
    window.addEventListener("resize", resizeInputText)
    inputTextbox.addEventListener("input", resizeInputText)
    inputTextbox.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault()
      }
    })
    inputTextbox.addEventListener("keyup", (event) => {
      if (event.key === "Enter") {
        event.preventDefault()
        if (!rendering) {
          sendPrompt(inputTextbox.value)
          inputTextbox.value = ""
          if (isMobileDevice()) {
            inputTextbox.blur()
          }
          resizeInputText()
          if (inputSend.classList.contains("active")) {
            inputSend.classList.remove("active")
          }
        }
      }
    })
    inputTextbox.addEventListener("input", () => {
      if (inputTextbox.value.length > 0) {
        if (!inputSend.classList.contains("contains")) {
          inputSend.classList.add("active")
        }
      } else {
        inputSend.classList.remove("active")
      }
    })

    inputSend.addEventListener("click", () => {
      if (!rendering) {
        sendPrompt(inputTextbox.value)
        inputTextbox.value = ""
        if (isMobileDevice()) {
          inputTextbox.blur()
        }
        resizeInputText()
        if (inputSend.classList.contains("active")) {
          inputSend.classList.remove("active")
        }
      }
    })

    inputContainer.addEventListener("click", () => {
      inputTextbox.focus()
    })
    inputContainer.style.display = "flex"

    labelDisclaimer.innerText = t("disclaimer")

    document.addEventListener("keydown", function (event) {
      const KEY_CTRL = event.ctrlKey || event.metaKey
      const KEY_1 = event.code === "Digit1"
      const KEY_2 = event.code === "Digit2"
      const KEY_3 = event.code === "Digit3"

      if (KEY_CTRL && KEY_1) {
        event.preventDefault()
        try {
          document.querySelectorAll(".actions_container button")[0].click()
          setTimeout(() => {
            inputTextbox.blur()
            inputTextbox.focus()
          }, 25)
        } catch (err) {
          //
        }
      }

      if (KEY_CTRL && KEY_2) {
        event.preventDefault()
        try {
          document.querySelectorAll(".actions_container button")[1].click()
          setTimeout(() => {
            inputTextbox.blur()
            inputTextbox.focus()
          }, 25)
        } catch (err) {
          //
        }
      }

      if (KEY_CTRL && KEY_3) {
        event.preventDefault()
        try {
          document.querySelectorAll(".actions_container button")[2].click()
          setTimeout(() => {
            inputTextbox.blur()
            inputTextbox.focus()
          }, 25)
        } catch (err) {
          //
        }
      }
    })

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

    chatHistory.push({ type: "system", text: t("system_prompt") })

    appendMessage("reply", markdownToHTML(t("system_welcome")))

    pleaseWait.style.display = "none"
    container.style.display = "block"

    resizeInputText()

    if (!isMobileDevice()) {
      setTimeout(() => {
        inputTextbox.focus()
      }, 200)
    }
  }
})
