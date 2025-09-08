const APP_STRINGS = {
  en: {
    title: "Llama",
    thinking: "Thinking...",
    writing: "Writing...",
    placeholder: "Write a message",
    system_prompt: "You are a useful AI assistant.",
    system_welcome: "Hello, how can I help you today?",
  },
  es: {
    title: "Llama",
    thinking: "Pensando...",
    writing: "Escribiendo...",
    placeholder: "Escribe un mensaje",
    system_prompt: "T\u00FA eres un \u00FAtil asistente AI.",
    system_welcome: "Hola, \u00BFc\u00F3mo puedo ayudarte hoy?",
  },
}

const USER_LANG = window.navigator.language.substring(0, 2).toLowerCase()
const GET_APP_STRING = APP_STRINGS[USER_LANG] || APP_STRINGS["en"]
const t = (stringName) => GET_APP_STRING[stringName] || ""
