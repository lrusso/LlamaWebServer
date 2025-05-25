# Llama Web Server

Web server implementation of Llama.

## How to run the server

- Download a GGUF model file from [HuggingFace.co](https://huggingface.co)
- Place the GGUF model file in the `model` folder.
- Run `npm install`
- Run `npm run start`
- Browse to `http://localhost`

## How to run the server using a different port

- Run `npm run start 8080`
- Browse to `http://localhost:8080`

## Running the Web server in the background

1. Install Forever: `npm install -g forever`
2. Start the server: `npm run forever`
3. Stop the server: `npm run stop`

## Forcing the light and dark modes

- Browse to `http://localhost/?lightmode`

- Browse to `http://localhost/?darkmode`

## Characters and rules

The characters and rules are defined in the [characters.json](https://github.com/lrusso/LlamaWebServer/blob/main/src/characters.json) file.

```json
{
  "characters": {
    "Assistant": {
      "system_prompt": "You are a useful AI assistant.",
      "welcome_message": "Hello, how can I help you today?"
    }
  },
  "rules": "You are not allowed to provide illegal advices or inappropriate content."
}
```

## Suggested GGUF models

- [Llama 3.1 8B (8.54 GB)](https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q8_0.gguf?download=true)
- [Llama 3.1 8B (4.32 GB)](https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q3_K_L.gguf?download=true)
- [Llama 3.1 8B Uncensored (8.54 GB)](https://huggingface.co/bartowski/Llama-3.1-8B-Lexi-Uncensored-V2-GGUF/resolve/main/Llama-3.1-8B-Lexi-Uncensored-V2-Q8_0.gguf?download=true)
- [Llama 3.1 8B Uncensored (4.32 GB)](https://huggingface.co/bartowski/Llama-3.1-8B-Lexi-Uncensored-V2-GGUF/resolve/main/Llama-3.1-8B-Lexi-Uncensored-V2-Q3_K_L.gguf?download=true)

## Disclaimer

You are legally responsible for any damage that you could cause with this software when using it with an AI model.
