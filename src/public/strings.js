const APP_STRINGS = {
  en: {
    title: "Llama",
    thinking: "Thinking...",
    writing: "Writing...",
    select_character: "Select a character:",
    regenerate: "REGENERATE",
    placeholder: "Write a message",
    system_error: "System error. Please try again.",
  },
  es: {
    title: "Llama",
    thinking: "Pensando...",
    writing: "Escribiendo...",
    select_character: "Seleccione un personaje:",
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
