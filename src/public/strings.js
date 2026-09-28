const APP_STRINGS = {
  en: {
    title: "Llama",
    thinking: "Thinking...",
    writing: "Writing...",
    placeholder: "Write a message",
    system_prompt: "You are a useful AI assistant.",
    system_welcome: "Hello, how can I help you today?",
    disclaimer: "Llama is AI and can make mistakes.",
  },
  es: {
    title: "Llama",
    thinking: "Pensando...",
    writing: "Escribiendo...",
    placeholder: "Escribe un mensaje",
    system_prompt: "T\xFA eres un \xFAtil asistente AI.",
    system_welcome: "Hola, \xBFc\xF3mo puedo ayudarte hoy?",
    disclaimer: "Llama es una IA y puede cometer errores.",
  },
}

const USER_LANG = window.navigator.language.substring(0, 2).toLowerCase()
const GET_APP_STRING = APP_STRINGS[USER_LANG] || APP_STRINGS["en"]
const t = (stringName) => GET_APP_STRING[stringName] || ""
