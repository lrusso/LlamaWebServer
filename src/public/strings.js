const APP_STRINGS = {
  en: {
    title: "Llama",
    thinking: "Thinking...",
    writing: "Writing...",
    placeholder: "Ask Llama",
    system_prompt: "You are a useful AI assistant.",
    today: "Today is",
    system_welcome: "Hello, how can I help you today?",
    disclaimer: "Llama is AI and can make mistakes.",
    copied: "Copied to clipboard.",
    copy_error: "Error copying to clipboard.",
    next_reply: "Next reply",
    regenerate: "Regenerate",
    copy: "Copy",
    edit: "Edit",
    cancel: "Cancel",
    update: "Update",
    send: "Send",
  },
  es: {
    title: "Llama",
    thinking: "Pensando...",
    writing: "Escribiendo...",
    placeholder: "Preg\xFAntale a Llama",
    system_prompt: "Eres un asistente de IA \xFAtil.",
    today: "Hoy es",
    system_welcome: "Hola, \xBFc\xF3mo puedo ayudarte hoy?",
    disclaimer: "Llama es una IA y puede cometer errores.",
    copied: "Copiado al portapapeles.",
    copy_error: "Error al copiar al portapapeles.",
    next_reply: "Siguiente respuesta",
    regenerate: "Regenerar",
    copy: "Copiar",
    edit: "Editar",
    cancel: "Cancelar",
    update: "Actualizar",
    send: "Enviar",
  },
}

const USER_LANG = window.navigator.language.substring(0, 2).toLowerCase()
const GET_APP_STRING = APP_STRINGS[USER_LANG] || APP_STRINGS["en"]
const t = (stringName) => GET_APP_STRING[stringName] || ""
