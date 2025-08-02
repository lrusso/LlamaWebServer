const APP_STRINGS = {
  en: {
    title: "Llama",
    thinking: "Thinking...",
    writing: "Writing...",
    placeholder: "Write a message",
    system_prompt: "You are a useful AI assistant.",
    system_welcome: "Hello, how can I help you today?",
    system_error: "System error. Please try again.",
  },
  es: {
    title: "Llama",
    thinking: "Pensando...",
    writing: "Escribiendo...",
    placeholder: "Escribe un mensaje",
    system_prompt: "Eres un eficiente asistente AI.",
    system_welcome: "\u00BFPuedo ayudarte en algo?",
    system_error: "Error del sistema. Por favor intente de nuevo.",
  },
}

const USER_LANG = window.navigator.language.substring(0, 2).toLowerCase()
const GET_APP_STRING =
  typeof APP_STRINGS[USER_LANG] === "undefined"
    ? APP_STRINGS["en"]
    : APP_STRINGS[USER_LANG]

const t = (stringName) => {
  return GET_APP_STRING[stringName] || ""
}
