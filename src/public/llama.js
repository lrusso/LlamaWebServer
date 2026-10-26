let customResponseRegexRules = []
let customPromptRegexRules = []
let customPrefix = ""
let rendering = false
let chatHistory = []
let replies = []
let renderedReplies = []
let selectedReply = 0
let toastTimeout = null
let promptBeforeEdit = ""
let fetchController = null
let isFocusEventHandled = false
let reply = ""
let stableReplyLength = 0
let stableReplyHTML = ""
let lastReply = null
let lastPrompt = ""

// a code block (or three backticks closed on the same line, e.g. ```npm install```)
// with the indentation before its fence. the last group is the closing fence, which
// is empty while the block is still being written
const CODE_BLOCK_REGEX =
  /([ \t]*)\`\`\`(?:([^`\n]+?)\`\`\`|[^\n]*(?:\n|$)([\s\S]*?)(\`\`\`\n?|$))/g

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

const ICON_CANCEL = () => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("class", "cancel")
  svg.setAttribute("width", "24")
  svg.setAttribute("height", "24")
  svg.setAttribute("viewBox", "0 0 24 24")
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
  path.setAttribute(
    "d",
    "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
  )
  svg.appendChild(path)
  return svg
}

const ICON_UPDATE = () => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("class", "update")
  svg.setAttribute("width", "24")
  svg.setAttribute("height", "24")
  svg.setAttribute("viewBox", "0 0 24 24")
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
  path.setAttribute("d", "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z")
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

const copyToClipboard = (element, button) => {
  if (navigator.clipboard) {
    // the clipboard api only exists in secure contexts (https or localhost)
    navigator.clipboard.writeText(element.innerText).then(
      () => {
        showToast(t("copied"))
      },
      (_err) => {
        // e.g. the browser didn't allow the copy
        showToast(t("copy_error"))
      }
    )
  } else {
    // legacy copy for the insecure contexts (plain http), where the clipboard
    // api doesn't exist. execCommand copies the current selection, so the
    // element is selected first and unselected afterwards
    const selection = window.getSelection()
    const range = document.createRange()

    range.selectNodeContents(element)
    selection.removeAllRanges()
    selection.addRange(range)

    try {
      if (document.execCommand("copy")) {
        showToast(t("copied"))
      } else {
        showToast(t("copy_error"))
      }
    } catch (err) {
      showToast(t("copy_error"))
    }

    selection.removeAllRanges()
  }

  if (!isMobileDevice()) {
    button.blur()
  }
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

const addPointer = (html) => {
  const pointer = '<div class="pointer"></div>'

  // while a table is being written (it's the end of the reply), the pointer goes
  // at the end of the cell being written (the last one with content before the
  // empty ones, or the first one when a row has just started) instead of under
  // the table
  const pointerInTable = html.replace(
    /<\/td>((?:<td><\/td>)*)<\/tr><\/tbody><\/table>$/,
    pointer + "</td>$1</tr></tbody></table>"
  )

  return pointerInTable !== html ? pointerInTable : html + pointer
}

const getStableLength = (text) => {
  // the complete lines don't change anymore while the reply is written, except the
  // ones that go together with the next line: the lines of a code block, a table row
  // ("|"), a quote (">"), an empty line (a title without text yet takes the next
  // line), and the title, the divider and the end of a code block (they take the
  // line break after them, so the next line is converted right after them)
  const codeBlocks = []
  let codeBlock = null
  CODE_BLOCK_REGEX.lastIndex = 0
  while ((codeBlock = CODE_BLOCK_REGEX.exec(text))) {
    // a code block still being written goes until the end of the text
    const blockEnd =
      codeBlock[4] === "" ? text.length + 1 : CODE_BLOCK_REGEX.lastIndex
    codeBlocks.push([codeBlock.index, blockEnd])
  }

  const goesWithNextLine =
    /^(?:[|>]|\s*$|#{1,6}(?:\s|$)| {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$)/
  const lines = text.split("\n")
  let lineEnd = text.length - lines[lines.length - 1].length
  for (let i = lines.length - 2; i >= 0; i--) {
    const isInCodeBlock = codeBlocks.some((block) => {
      return block[0] < lineEnd && lineEnd <= block[1]
    })
    if (!isInCodeBlock && !goesWithNextLine.test(lines[i])) {
      return lineEnd
    }
    lineEnd = lineEnd - lines[i].length - 1
  }
  return 0
}

const renderReply = () => {
  // the lines that can't change anymore are converted only once, so each chunk only
  // converts (and looks for the place of the pointer in) the lines still being
  // written, however long the reply is
  const pending = reply.slice(stableReplyLength)
  const stableLength = getStableLength(pending)

  if (stableLength > 0) {
    const stableText = pending.slice(0, stableLength)
    stableReplyHTML =
      stableReplyHTML +
      markdownToHTML(stableText.replace(/&/g, "&#38;").replace(/\</g, "&#60;"))
    stableReplyLength = stableReplyLength + stableLength
  }

  const writingText = pending.slice(stableLength)
  patchDOM(
    lastReply,
    stableReplyHTML +
      addPointer(
        markdownToHTML(writingText.replace(/&/g, "&#38;").replace(/\</g, "&#60;"))
      )
  )
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

  lastPrompt = prompt

  let buttonEdit = document.querySelector(".edit_button")

  if (!hidePrompt) {
    const promptContainer = createComponent("div", "prompt_container")
    const promptBackground = createComponent("span", "prompt_background")
    const promptContent = createComponent("div", "prompt_content", "", prompt)
    const editContainer = createComponent("div", "edit_container")
    const buttonCopy = createComponent("button", "action_button")

    // a new prompt discards the unsent changes of the one being edited
    if (document.querySelector(".prompt_background.editing")) {
      endPromptEdit()
    }

    // only the last prompt can be edited, the previous ones only keep their
    // copy button
    if (buttonEdit) {
      buttonEdit.remove()
    }

    promptContent.addEventListener("keydown", handlePromptKeydown)
    promptContent.addEventListener("input", handlePromptInput)
    promptContent.addEventListener("paste", handlePromptPaste)

    buttonEdit = createComponent("button", "action_button edit_button")
    buttonEdit.type = "button"
    buttonEdit.title = t("edit")
    buttonEdit.appendChild(ICON_EDIT())
    buttonEdit.addEventListener("click", editPrompt)

    buttonCopy.type = "button"
    buttonCopy.title = t("copy")
    buttonCopy.appendChild(ICON_COPY())
    buttonCopy.addEventListener("click", () => {
      copyToClipboard(promptContent, buttonCopy)
      inputTextbox.focus()
    })
    buttonCopy.children[0].classList.add("active")
    buttonCopy.style.cursor = "pointer"

    promptBackground.appendChild(promptContent)
    promptContainer.appendChild(promptBackground)
    editContainer.appendChild(buttonEdit)
    editContainer.appendChild(buttonCopy)
    content.appendChild(promptContainer)
    content.appendChild(editContainer)

    // the previous reply only keeps its copy button, which is the last one
    const actionsContainer = document.querySelector(".actions_container")
    if (actionsContainer) {
      actionsContainer.className = "copy_container"
      while (actionsContainer.children.length > 1) {
        actionsContainer.removeChild(actionsContainer.firstChild)
      }
    }

    lastReply = appendMessage("reply", '<div class="pointer"></div>')

    content.scrollTop = content.scrollHeight
  } else {
    lastReply =
      document.getElementsByClassName("reply")[
        document.getElementsByClassName("reply").length - 1
      ]
    const hasOnlyPointer =
      lastReply.children.length === 1 &&
      lastReply.firstElementChild &&
      lastReply.firstElementChild.classList.contains("pointer")
    if (!hasOnlyPointer) {
      while (lastReply.firstChild) {
        lastReply.removeChild(lastReply.firstChild)
      }
      const pointer = document.createElement("div")
      pointer.className = "pointer"
      lastReply.appendChild(pointer)
    }
  }

  // the last prompt can't be edited while the reply is being generated
  buttonEdit.children[0].classList.remove("active")
  buttonEdit.disabled = true
  buttonEdit.style.cursor = "default"

  document.title = t("title") + " - " + t("thinking")

  reply = ""
  stableReplyLength = 0
  stableReplyHTML = ""

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
                // streaming, so a character split between two chunks isn't broken
                reply = reply + decoder.decode(value, { stream: true })
                renderReply()

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

  handleReply(content, reply, lastReply, lastPrompt)
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
  const buttonEdit = document.querySelector(".edit_button")

  buttonNext.type = "button"
  buttonNext.title = t("next_reply")
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
    let formattedPrompt = prompt
    customPromptRegexRules.forEach((rule) => {
      formattedPrompt = formattedPrompt.replace(rule.regex, rule.replacement)
    })

    chatHistory.push({ type: "user", text: customPrefix + formattedPrompt })

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

    // the reply was already converted while it was written, so switching to it
    // doesn't apply the markdown rules again (slow on phones with long replies)
    promptResult.innerHTML = renderedReplies[selectedReply]

    inputTextbox.focus()
  })

  buttonRegenerate.type = "button"
  buttonRegenerate.title = t("regenerate")
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

    inputTextbox.focus()
  })

  buttonCopy.type = "button"
  buttonCopy.title = t("copy")
  buttonCopy.appendChild(ICON_COPY())
  buttonCopy.addEventListener("click", () => {
    copyToClipboard(promptResult, buttonCopy)
    inputTextbox.focus()
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

  // the converted reply is kept for the next reply button
  renderedReplies.push(promptResult.innerHTML)

  rendering = false
}

const editPrompt = () => {
  if (rendering) {
    return
  }

  const prompts = document.querySelectorAll(".prompt_content")
  const promptContent = prompts[prompts.length - 1]
  const selection = window.getSelection()
  const buttonEdit = document.querySelector(".edit_button")
  const buttonCancel = createComponent("button", "action_button active")
  const buttonUpdate = createComponent("button", "action_button")

  buttonCancel.type = "button"
  buttonCancel.title = t("cancel")
  buttonCancel.appendChild(ICON_CANCEL())
  buttonCancel.children[0].classList.add("active")
  buttonCancel.addEventListener("click", endPromptEdit)

  buttonUpdate.type = "button"
  buttonUpdate.title = t("update")
  buttonUpdate.disabled = true
  buttonUpdate.appendChild(ICON_UPDATE())
  buttonUpdate.addEventListener("click", () => {
    updatePrompt(promptContent)
  })

  // the pencil and copy buttons are replaced by the cancel and update buttons
  // at once, so the row of buttons never collapses in between
  buttonEdit.style.display = "none"
  buttonEdit.nextSibling.style.display = "none"
  buttonEdit.parentNode.appendChild(buttonCancel)
  buttonEdit.parentNode.appendChild(buttonUpdate)

  promptBeforeEdit = promptContent.innerText
  promptContent.contentEditable = "true"

  // a screen reader announces the prompt being edited as a text field
  promptContent.setAttribute("role", "textbox")
  promptContent.setAttribute("aria-multiline", "true")
  promptContent.setAttribute("aria-label", t("edit"))

  // the prompt looks like the input textbox while it's being edited
  promptContent.parentNode.classList.add("editing")
  promptContent.focus()

  // moving the caret to the end of the prompt
  selection.selectAllChildren(promptContent)
  selection.collapseToEnd()
}

const handlePromptKeydown = (event) => {
  const promptContent = event.currentTarget

  if (event.key === "Escape") {
    endPromptEdit()
  }

  // enter updates the prompt and shift + enter adds a new line
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault()
    updatePrompt(promptContent)
  }
}

const updatePrompt = (promptContent) => {
  const newPrompt = promptContent.innerText.trim()

  if (rendering || newPrompt === "" || newPrompt === promptBeforeEdit) {
    endPromptEdit()
    return
  }

  const actionsContainer = document.querySelector(".actions_container")

  promptBeforeEdit = newPrompt
  endPromptEdit()

  if (actionsContainer) {
    actionsContainer.remove()
  }

  // replacing the last prompt and removing the last reply
  chatHistory.pop()
  chatHistory.pop()
  replies.splice(0, replies.length)
  renderedReplies.splice(0, renderedReplies.length)
  ask(newPrompt, true)
}

const endPromptEdit = () => {
  const prompts = document.querySelectorAll(".prompt_content")
  const promptContent = prompts[prompts.length - 1]
  const buttonEdit = document.querySelector(".edit_button")
  const editContainer = buttonEdit.parentNode

  // ending the edition discards the unsent changes
  promptContent.contentEditable = "false"
  promptContent.removeAttribute("role")
  promptContent.removeAttribute("aria-multiline")
  promptContent.removeAttribute("aria-label")
  promptContent.innerText = promptBeforeEdit
  promptContent.parentNode.classList.remove("editing")
  document.querySelector(".input_textbox").focus()

  // the cancel and update buttons are replaced by the pencil and copy buttons
  while (editContainer.children.length > 2) {
    editContainer.removeChild(editContainer.lastChild)
  }
  buttonEdit.style.display = ""
  buttonEdit.nextSibling.style.display = ""
}

const handlePromptInput = (event) => {
  const buttonUpdate = document.querySelector(".update").parentNode
  const isChanged = event.currentTarget.innerText.trim() !== promptBeforeEdit

  // the update button is only enabled while the prompt is changed
  buttonUpdate.classList.toggle("active", isChanged)
  buttonUpdate.children[0].classList.toggle("active", isChanged)
  buttonUpdate.disabled = !isChanged
}

const handlePromptPaste = (event) => {
  try {
    // pasting only the plain text, so no html gets into the prompt
    event.preventDefault()

    const text = event.clipboardData.getData("text/plain")
    const selection = window.getSelection()
    const range = selection.getRangeAt(0)

    // replacing the selected text (if any) and leaving the caret after it
    range.deleteContents()
    range.insertNode(document.createTextNode(text))
    range.collapse(false)

    selection.removeAllRanges()
    selection.addRange(range)

    // the pasted text doesn't fire the input event, since it's inserted by hand
    handlePromptInput(event)
  } catch (err) {
    //
  }
}

const getCodeCopyButton = () => {
  // the copy button of a code block, written as html inside the <code>
  const button = createComponent("button", "action_button code_copy active")
  button.type = "button"
  button.title = t("copy")
  button.appendChild(ICON_COPY())
  button.children[0].classList.add("active")
  return button.outerHTML
}

const handleCodeCopy = (event) => {
  // a single listener for every code block, since the replies are rendered
  // again with each new chunk
  const button = event.target.closest(".code_copy")
  if (button) {
    copyToClipboard(button.parentNode, button)
    document.querySelector(".input_textbox").focus()
  }
}

const markdownToHTML = (markdown) => {
  const codeBlocks = []

  // storing and removing all the code blocks (a block that is still being
  // written, without its closing fence yet, goes until the end of the reply).
  // the code block is already a block, so the line break after its closing
  // fence and the last line break of the code (with the indentation of the
  // closing fence, e.g. inside a list) are removed, as they would add empty lines
  markdown = markdown.replace(CODE_BLOCK_REGEX, (_match, indent, inline, group) => {
    // three backticks closed on the same line (e.g. ```npm install```) are
    // inline code, not a code block
    if (inline) {
      return indent + "`" + inline + "`"
    }

    // the indentation of the fence (e.g. inside a list) isn't part of the code,
    // so it's removed from every line of the code and from before the block
    // (where it would add an empty line too)
    const code = group.replace(new RegExp("^" + indent, "gm"), "")
    codeBlocks.push(code.replace(/\n[ \t]*$/, ""))
    return "%%CODELLAMABLOCK" + (codeBlocks.length - 1) + "%%"
  })

  // storing and removing all the inline code (so it's not touched by the
  // emphasis rules below, e.g. __init__ becoming <strong>init</strong>). it can
  // be opened with several backticks to have a backtick inside (e.g. ``a`b``),
  // and it ends with exactly the same number of them
  const inlineCodes = []
  markdown = markdown.replace(
    /(^|[^`])(`+)(?!`)([^\n]*?[^`\n])\2(?!`)/g,
    (_match, before, _ticks, code) => {
      inlineCodes.push(code)
      return before + "%%CODELLAMAINLINE" + (inlineCodes.length - 1) + "%%"
    }
  )

  // storing and removing all the links (so their urls are not touched by the
  // emphasis rules below, e.g. an underscore inside a url becoming <em>)
  const links = []
  // (a url can have parentheses inside, e.g. wikipedia's /wiki/Python_(language))
  markdown = markdown.replace(
    /\[(.*?)\]\(((?:[^()\n]|\([^()\n]*\))*)\)/g,
    (_match, text, url) => {
      // only the http and https urls become links (a javascript url
      // would run code when clicked), and a quote can't close the href
      if (!/^https?:\/\//i.test(url)) {
        return text
      }
      url = url.replace(/"/g, "%22")
      links.push('<a href="' + url + '" target="_blank">' + text + "</a>")
      return "%%CODELLAMALINK" + (links.length - 1) + "%%"
    }
  )

  // storing and removing the urls written without the markdown format (e.g.
  // https://www.example.com), which become links too
  markdown = markdown.replace(/https?:\/\/(?:(?!%%CODELLAMA)[^\s<])+/g, (url) => {
    // the punctuation after a url (e.g. the period that ends a sentence) is not
    // part of it, and neither is a closing parenthesis without its opening one
    let trailing = ""
    while (
      /[.,;:!?'"*]$/.test(url) ||
      (/\)$/.test(url) && url.split("(").length < url.split(")").length)
    ) {
      trailing = url.slice(-1) + trailing
      url = url.slice(0, -1)
    }
    const href = url.replace(/"/g, "%22")
    links.push('<a href="' + href + '" target="_blank">' + url + "</a>")
    return "%%CODELLAMALINK" + (links.length - 1) + "%%" + trailing
  })

  // parsing markdown tables (the rows that are still being written, without
  // their last "|" yet, are already part of the table). like github, a table can
  // have only its header and its separator, without rows yet (once the
  // separator line is complete, so it doesn't flicker while it's being written)
  markdown = markdown.replace(
    /^(\|.+\|)\r?\n(\|[-: \t|]+\|)[ \t]*(?:\r?\n((?:\|.*(?:\r?\n|$))+)|\r?\n)/gm,
    (match, headerRow, separatorRow, bodyRows) => {
      function parseRow(row) {
        // a row still being written (without its last "|") keeps its last cell
        return row
          .split("|")
          .slice(1, /\|\s*$/.test(row) ? -1 : undefined)
          .map((cell) => {
            return cell.trim()
          })
      }

      const headers = parseRow(headerRow)

      // without rows yet, it's a table only once its separator has as many columns
      // as its header (like github), so a separator still being written isn't one
      if (!bodyRows && parseRow(separatorRow).length !== headers.length) {
        return match
      }

      // (a table without rows yet has none, instead of an empty one)
      const rows = (bodyRows || "")
        .trim()
        .split(/\r?\n/)
        .filter((row) => {
          return row !== ""
        })
        .map((row) => {
          return parseRow(row)
        })

      let html = "<table><thead><tr>"
      headers.forEach((header) => {
        html = html + "<th>" + header + "</th>"
      })
      html = html + "</tr></thead><tbody>"
      rows.forEach((row) => {
        // the row has all the columns of the table, even while its first cells are
        // still being written
        while (row.length < headers.length) {
          row.push("")
        }

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
    // the other ways to write that line (e.g. ***, ___, ----, - - - or * * *), only
    // once the line is complete, so a line that starts with *** (bold and italic)
    // isn't a line for a moment while it's being written
    { regex: /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*\n/gm, replacement: "<hr>" },
    // before the emphasis rules, so the asterisk of a bullet isn't an <em>.
    // the indented bullets (sublists) keep their indentation, and the spaces
    // after the bullet (e.g. "*   text") become just one
    {
      regex: /^([ \t]*)[\*\-\+][ \t]+(.+)$/gm,
      replacement: function replacement(_match, indent, item) {
        return indent + "&#8226; " + item
      },
    },
    // the asterisks must be next to the text, so 5 * 3 * 2 isn't an emphasis
    {
      regex: /\*\*([^\s*](?:.*?[^\s*])?)\*\*/g,
      replacement: "<strong>$1</strong>",
    },
    { regex: /\*([^\s*](?:.*?[^\s*])?)\*/g, replacement: "<em>$1</em>" },
    // the underscores inside a word (e.g. my_var_name) are not an emphasis
    { regex: /\b__(.*?)__\b/g, replacement: "<strong>$1</strong>" },
    { regex: /\b_(.*?)_\b/g, replacement: "<em>$1</em>" },
    // ~~text~~ is a strikethrough (the tildes must be next to the text too)
    { regex: /~~([^\s~](?:.*?[^\s~])?)~~/g, replacement: "<del>$1</del>" },
    // the title is already a block, so the line break after it is removed (like
    // the one after the <hr>), as it would add an empty line
    {
      regex: /^(#{1,6})\s+(.*)$\n?/gm,
      replacement: function replacement(_match, hashes, content) {
        return "<h" + hashes.length + ">" + content + "</h" + hashes.length + ">"
      },
    },
    // the lines that start with ">" are a quote
    {
      regex: /^(?:> ?.*(?:\n|$))+/gm,
      replacement: function replacement(match) {
        return (
          "<blockquote>" +
          match.replace(/\n$/, "").replace(/^> ?/gm, "") +
          "</blockquote>"
        )
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

  // restoring all the inline code
  markdown = markdown.replace(/%%CODELLAMAINLINE(\d+)%%/g, (_match, index) => {
    return '<div class="highlighted">' + inlineCodes[index] + "</div>"
  })

  // restoring all the code blocks, each one with its copy button
  markdown = markdown.replace(/%%CODELLAMABLOCK(\d+)%%/g, (_match, index) => {
    const code = codeBlocks[index].replace(/```/g, "")
    return "<code>" + getCodeCopyButton() + code + "</code>"
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

const sendPrompt = () => {
  const inputTextbox = document.querySelector(".input_textbox")
  const inputSend = document.querySelector(".input_send")
  const prompt = inputTextbox.value.trim()

  // the prompt is sent with enter or with the send button, but not while a
  // reply is being generated
  if (rendering) {
    return
  }

  if (prompt) {
    replies.splice(0, replies.length)
    renderedReplies.splice(0, renderedReplies.length)
    ask(prompt)
  }

  inputTextbox.value = ""
  if (isMobileDevice()) {
    inputTextbox.blur()
  }
  resizeInputText()
  if (inputSend.classList.contains("active")) {
    inputSend.classList.remove("active")
    inputSend.disabled = true
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

document.addEventListener("click", handleCodeCopy)

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
    // the names a screen reader announces for the textbox and the send button
    inputTextbox.setAttribute("aria-label", t("placeholder"))
    inputSend.title = t("send")
    inputSend.disabled = true
    inputTextbox.disabled = false
    inputTextbox.value = ""
    window.addEventListener("resize", resizeInputText)
    inputTextbox.addEventListener("input", resizeInputText)
    inputTextbox.addEventListener("keydown", (event) => {
      // enter sends the prompt and shift + enter adds a new line
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault()
        sendPrompt()
      }
    })
    inputTextbox.addEventListener("input", () => {
      // the send button is only enabled while the textbox has text
      if (inputTextbox.value.length > 0) {
        inputSend.classList.add("active")
        inputSend.disabled = false
      } else {
        inputSend.classList.remove("active")
        inputSend.disabled = true
      }
    })

    inputSend.addEventListener("click", sendPrompt)

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
        } catch (err) {
          //
        }
      }

      if (KEY_CTRL && KEY_2) {
        event.preventDefault()
        try {
          document.querySelectorAll(".actions_container button")[1].click()
        } catch (err) {
          //
        }
      }

      if (KEY_CTRL && KEY_3) {
        event.preventDefault()
        try {
          document.querySelectorAll(".actions_container button")[2].click()
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

    // the system prompt goes with the date of today, since the model can't know it
    // (e.g. "You are a useful AI assistant. Today is Sun Oct 25 2026.")
    const today = t("today") + " " + new Date().toDateString() + "."
    chatHistory.push({
      type: "system",
      text: t("system_prompt") + " " + today,
    })

    appendMessage("reply", markdownToHTML(t("system_welcome")))

    pleaseWait.style.display = "none"
    container.style.display = "block"

    resizeInputText()

    if (!isMobileDevice()) {
      inputTextbox.focus()
    }
  }
})
