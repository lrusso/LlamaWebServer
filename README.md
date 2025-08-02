# Llama Web Server

Web server implementation of Llama. It's able to load and run a GGUF model file locally and provides a UI similar to WhatsApp. You can download a GGUF model file from [HuggingFace.co](https://huggingface.co) and place it in the `model` folder or run an `npm` command that will do it for you.

## How to run the server

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

## System prompt

The system prompt is defined in the [strings.js](https://github.com/lrusso/LlamaWebServer/blob/main/src/public/strings.js#L8) file.

## For systems with limited RAM that cannot run the Q8 model

- Run `npm install`
- Run `npm run download:q3`
- Browse to `http://localhost`

## Disclaimer

You are legally responsible for any damage that you could cause with this software.
