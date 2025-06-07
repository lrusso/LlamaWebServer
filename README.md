# Llama Web Server

Web server implementation of Llama. It's able to load and run a GGUF model file locally and provides a UI similar to WhatsApp. You can download a GGUF model file from [HuggingFace.co](https://huggingface.co) and place it in the `model` folder or run an `npm` command that will do it for you.

## How to run the server

- Run `npm install`
- Run `npm run download:q8` or `npm run download:q3` (lightweight AI model)
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

## Disclaimer

You are legally responsible for any damage that you could cause with this software.
