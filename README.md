# Llama Web Server

Web server implementation of Llama.

## How to run the server

- Download a GGUF model file from [HuggingFace.co](https://huggingface.co)
- Place the GGUF model file in the `model` folder.
- Run `npm install`
- Run `npm start`
- Browse to `http://localhost`

## Forcing the light and dark modes:

- Browse to `http://localhost/?lightmode`

- Browse to `http://localhost/?darkmode`

**NOTE 1:** The system prompt comes from the frontend. The backend the only thing that is doing is receiving the chat history (where the system prompt is included) and passing the prompt to the AI model.

**NOTE 2:** You are legally responsible for any damage that you could cause with this software when using it with an AI model.
