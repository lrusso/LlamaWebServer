# Llama Web Server

This is a web server implementation of Llama that lets you run a GGUF model file locally. It includes a user interface that's similar to WhatsApp. By default, the project automatically downloads a `Llama-3.1-8B-Instruct-Q8_0` AI model file. Alternatively, you can simply download a GGUF model file from [HuggingFace.co](https://huggingface.co) and place it in the `model` folder. 

## How to run the server

- Run `npm install`
- Run `npm run start`
- Browse to `http://localhost`

## How to run the server using a different port

- Run `npm install`
- Run `npm run start 8080`
- Browse to `http://localhost:8080`

## How to run the server in the background

- Run `npm install -g forever`
- Run `npm install`
- Run `npm run forever`
- Browse to `http://localhost`
- To stop the server, run `npm run stop`

## How to run the server on systems with limited RAM

- Run `npm install`
- Run `npm run download:q3`
- Run `npm run start`
- Browse to `http://localhost`

## Forcing the light and dark modes

- Browse to `http://localhost/?lightmode`
- Browse to `http://localhost/?darkmode`

## System prompt

The system prompt is defined in the [strings.js](https://github.com/lrusso/LlamaWebServer/blob/main/src/public/strings.js#L7) file.

## Disclaimer

You are legally responsible for any damage that you could cause with this software.
