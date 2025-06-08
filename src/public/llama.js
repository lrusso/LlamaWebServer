let customRegexRules = []
let rendering = false
let history = null
let lastContent = ""
let dataCharacters = {}
let dataRules = ""
let welcomeText = ""
let selectedCharacter = -1

const ask = async (prompt, hidePrompt) => {
  prompt = prompt.trim()

  if (selectedCharacter === -1) {
    try {
      const characterIndex = parseInt(prompt) - 1
      const characterInfo = Object.entries(dataCharacters)[characterIndex]
      if (characterInfo) {
        selectedCharacter = characterIndex
        let systemPrompt = characterInfo[1].system_prompt + ". " + dataRules + "."
        systemPrompt = systemPrompt.replace(/\.\. /, ". ")
        history = [
          {
            type: "system",
            text: systemPrompt,
          },
        ]
        document.getElementsByClassName("agent_name")[0].innerText = characterInfo[0]
        document.getElementsByClassName("agent_image")[0].style.backgroundImage =
          "url(characters/" + characterInfo[0].toLowerCase() + ".jpg)"
        document.getElementById("content").innerHTML = ""
        const welcomeMessage = document.createElement("span")
        welcomeMessage.className = "reply"
        welcomeMessage.innerHTML = characterInfo[1].welcome_message
        document.getElementById("content").appendChild(welcomeMessage)
      }
    } catch (err) {
      //
    }
    return
  }

  rendering = true

  if (document.getElementsByClassName("action_button")[0]) {
    document.getElementsByClassName("action_button")[0].remove()
  }

  lastContent = document.getElementById("content").innerHTML

  history.push({
    type: "user",
    text: prompt,
  })

  if (!hidePrompt) {
    const promptContainer = document.createElement("div")
    promptContainer.className = "prompt"
    const promptBackground = document.createElement("span")
    promptBackground.className = "prompt_background"
    const promptContent = document.createElement("div")
    promptContent.className = "prompt_content"
    promptContent.innerText = prompt
    promptBackground.appendChild(promptContent)
    promptContainer.appendChild(promptBackground)
    document.getElementById("content").appendChild(promptContainer)
  }

  const promptResult = document.createElement("span")
  promptResult.className = "reply"
  promptResult.innerHTML = '<div id="pointer" class="moving"></div>'
  document.getElementById("content").appendChild(promptResult)

  document.title = t("title") + " - " + t("thinking")

  setTimeout(() => {
    document
      .getElementById("content")
      .scrollTo(0, document.getElementById("content").scrollHeight)
  }, 100)

  let reply = ""

  try {
    const responseAPI = await fetch(window.location.origin + "/ask", {
      method: "POST",
      body: JSON.stringify(history),
    })

    document.title = t("title") + " - " + t("writing")

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
    reply = t("system_error")
    promptResult.innerHTML = t("system_error")
    scrollToBottom()
  }

  if (reply === "") {
    promptResult.innerHTML = "&nbsp;"
  }

  history.push({
    type: "model",
    response: [reply],
  })

  document.title = t("title")

  const buttonAction = document.createElement("input")
  buttonAction.className = "action_button"
  buttonAction.type = "button"
  buttonAction.value = t("regenerate")
  buttonAction.onclick = () => {
    document.getElementById("content").innerHTML = lastContent
    history.pop()
    history.pop()
    ask(prompt, hidePrompt)
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
  const computedStyle = window.getComputedStyle(element)
  return parseFloat(computedStyle.fontSize)
}

const resizeInputText = () => {
  try {
    document.getElementById("inputbox").rows = 1
    document.getElementById("inputbox").height = "auto"

    const scrollHeight = document.getElementById("inputbox").scrollHeight

    if (scrollHeight > document.getElementById("inputbox").clientHeight) {
      let newRows = Math.floor(
        scrollHeight / getLineHeight(document.getElementById("inputbox"))
      )
      newRows = newRows <= 5 ? newRows : 5
      document.getElementById("inputbox").rows = newRows

      document.getElementsByClassName("input_background")[0].style.height =
        64 + document.getElementById("inputbox").clientHeight - 18 + "px"
      document.getElementById("content").style.bottom =
        65 + document.getElementById("inputbox").clientHeight - 18 + "px"
    } else {
      document.getElementsByClassName("input_background")[0].style.height = "64px"
      document.getElementById("content").style.bottom = "65px"
    }
  } catch (err) {
    //
  }
}

const resizeElements = () => {
  const windowHeight = window.innerHeight

  // CHECKING IF THE MOBILE KEYBOARD IS VISIBLE
  if (window.visualViewport && window.visualViewport.height < windowHeight) {
    const keyboardHeight = windowHeight - window.visualViewport.height
    document.getElementById("content").style.bottom = 65 + keyboardHeight + "px"
    document.getElementById("content").style.height =
      windowHeight - keyboardHeight - 150 + "px"
    document.getElementsByClassName("input_background")[0].style.bottom =
      keyboardHeight + "px"
    document.getElementsByClassName("input_wrapper")[0].style.bottom =
      9 + keyboardHeight + "px"
  } else {
    document.getElementById("content").style.bottom = "65px"
    document.getElementById("content").style.height = windowHeight - 150 + "px"
    document.getElementsByClassName("input_background")[0].style.bottom = "0px"
    document.getElementsByClassName("input_wrapper")[0].style.bottom = "9px"
  }

  setTimeout(() => {
    resizeInputText()
    document
      .getElementById("content")
      .scrollTo(0, document.getElementById("content").scrollHeight)
  }, 100)
}

window.addEventListener("resize", resizeElements)
window.addEventListener("orientationchange", resizeElements)
window.addEventListener("focusin", resizeElements)
window.addEventListener("focusout", resizeElements)

window.addEventListener("load", async () => {
  if (window.top === window.self) {
    document.getElementById("content").innerHTML = ""

    document.addEventListener("keyup", (event) => {
      if (event.key === "Escape") {
        document.getElementsByClassName("agent_fullscreen")[0].style.display = "none"
        if (!isMobileDevice()) {
          document.getElementById("inputbox").focus()
        }
      }
    })

    document
      .getElementsByClassName("agent_image")[0]
      .addEventListener("click", () => {
        document.getElementsByClassName(
          "agent_fullscreen"
        )[0].style.backgroundImage = document.getElementsByClassName(
          "agent_image"
        )[0].style.backgroundImage
          ? document.getElementsByClassName("agent_image")[0].style.backgroundImage
          : "url(app.png)"
        document.getElementsByClassName("agent_fullscreen")[0].style.display =
          "block"
      })

    document
      .getElementsByClassName("agent_fullscreen")[0]
      .addEventListener("click", () => {
        document.getElementsByClassName("agent_fullscreen")[0].style.display = "none"
        if (!isMobileDevice()) {
          document.getElementById("inputbox").focus()
        }
      })

    document.getElementById("inputbox").placeholder = t("placeholder")
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
          resizeInputText()
        }
      }
    })
    document.getElementById("inputbox").addEventListener("input", function () {
      resizeInputText()
    })

    document
      .getElementsByClassName("input_wrapper")[0]
      .addEventListener("click", function () {
        document.getElementById("inputbox").focus()
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

    document.getElementsByClassName("agent_name")[0].innerText = t("title")

    document.getElementById("content").innerHTML = ""
    document.getElementById("inputbox").disabled = false

    try {
      const fetchResult = await fetch("/characters")
      if (fetchResult) {
        const fetchData = await fetchResult.text()
        dataCharacters = JSON.parse(fetchData).characters
        dataRules = JSON.parse(fetchData).rules
        const welcomeMessage = document.createElement("span")
        welcomeMessage.className = "reply"
        welcomeMessage.innerHTML = t("select_character")
        let counter = 1
        Object.entries(dataCharacters).map(([name, description]) => {
          welcomeMessage.innerHTML =
            welcomeMessage.innerHTML + "<br>" + counter + ") " + name
          counter = counter + 1
        })
        document.getElementById("content").appendChild(welcomeMessage)
      } else {
        const welcomeMessage = document.createElement("span")
        welcomeMessage.className = "reply"
        welcomeMessage.innerHTML = t("system_error")
        document.getElementById("content").appendChild(welcomeMessage)
      }
    } catch (err) {
      const welcomeMessage = document.createElement("span")
      welcomeMessage.className = "reply"
      welcomeMessage.innerHTML = t("system_error")
      document.getElementById("content").appendChild(welcomeMessage)
    }

    if (!isMobileDevice()) {
      document.getElementById("inputbox").focus()
    }

    document.getElementsByTagName("body")[0].style.opacity = 1
  }
})
