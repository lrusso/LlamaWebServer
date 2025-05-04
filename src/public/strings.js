const APP_STRINGS = {
  en: {
    title: "Llama",
    thinking: "Thinking...",
    writing: "Writing...",
    system_prompt: "You are a useful AI assistant.",
    welcome: "How can I help you today?",
    regenerate: "REGENERATE",
    placeholder: "Write a message",
    system_error: "System error. Please try again.",
  },
  es: {
    title: "Llama",
    thinking: "Pensando...",
    writing: "Escribiendo...",
    system_prompt: "Eres un eficiente asistente AI.",
    welcome: "&iquest;Con qu&eacute; puedo ayudarte?",
    regenerate: "REGENERAR",
    placeholder: "Escribe un mensaje",
    system_error: "Error del sistema. Por favor intente de nuevo.",
  },
}

const LANG = window.navigator.language.substring(0, 2).toLowerCase()
const GET_APP_STRING =
  typeof APP_STRINGS[LANG] === "undefined" ? APP_STRINGS["en"] : APP_STRINGS[LANG]

const t = (stringName) => {
  return GET_APP_STRING[stringName] || ""
}
