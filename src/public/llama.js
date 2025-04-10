let customRegexRules = []
let rendering = false
let history = null
let lastContent = ""

const ask = async (prompt, hidePrompt) => {
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

  if (!hidePrompt) {
    const promptContainer = document.createElement("div")
    promptContainer.className = "prompt"
    const promptSpan = document.createElement("span")
    promptSpan.className = "prompt_background"
    promptSpan.innerText = prompt
    promptContainer.append(promptSpan)
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

const createUniverse = (universe) => {
  let systemPrompt = ""

  // STEP 1 - ADDING THE UNIVERSE DESCRIPTION
  systemPrompt = systemPrompt + universe[0].description

  // STEP 2 - ADDING THE PLACES (IF ANY)
  systemPrompt = systemPrompt.trim()
  universe[1].places.forEach((place) => {
    for (let [name, description] of Object.entries(place)) {
      description = description.trim()
      description = description.endsWith(".") ? description : description + "."
      const regex = new RegExp(`\\{${name}\\}`, "gim")
      systemPrompt = systemPrompt.replace(regex, description)
    }
    systemPrompt = systemPrompt.replace(/\.\./gim, ".")
  })

  // STEP 3 - ADDING THE CHARACTERS (IF ANY)
  systemPrompt = systemPrompt.trim()
  universe[2].characters.forEach((character) => {
    for (let [name, description] of Object.entries(character)) {
      description = description.trim()
      description = description.endsWith(".") ? description : description + "."
      const regex = new RegExp(`\\{${name}\\}`, "gim")
      systemPrompt = systemPrompt.replace(regex, description)
    }
    systemPrompt = systemPrompt.replace(/\.\./gim, ".")
  })

  // STEP 4 - ADDING THE UNIVERSE RULES (IF ANY)
  systemPrompt = systemPrompt.trim()
  universe[3].rules.forEach((rule) => {
    rule = rule.trim()
    rule = rule.endsWith(".") ? rule : rule + "."
    systemPrompt = systemPrompt + " " + rule
  })

  return systemPrompt
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

window.addEventListener("resize", () => {
  setTimeout(() => {
    resizeInputText()
  }, 100)
})

window.addEventListener("load", () => {
  if (window.top === window.self) {
    document.getElementById("content").innerHTML = ""

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
        document.getElementById("inputbox").click()
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

    const welcomeMessage = document.createElement("span")
    welcomeMessage.className = "reply"
    history = [
      {
        type: "system",
        text: Array.isArray(t("system_prompt"))
          ? createUniverse(t("system_prompt"))
          : t("system_prompt"),
      },
    ]
    welcomeMessage.innerHTML = Array.isArray(t("system_prompt"))
      ? t("system_prompt")[4].welcomeMessage
      : t("welcome")
    document.getElementById("content").appendChild(welcomeMessage)

    if (!isMobileDevice()) {
      document.getElementById("inputbox").focus()
    }

    document.getElementsByTagName("body")[0].style.opacity = 1
  }
})
