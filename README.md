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

## Setting the system prompt

The backend receives from the frontend the chat history (that includes the system prompt and the prompt) and passes the chat history, the system prompt and the prompt to the AI model.

- Simple system prompt:

```json
{
  "system_prompt": "You are a useful AI assistant."
}
```

- Universe prompt:

```json
{
  "system_prompt": [
    {
      "description": "I'm going to be John and the AI is going to be acting like three characters: Buddy, Steven and Richard. {Buddy}. {Steven}. {Richard}. There are two places: Home and the Office. {Home}. {Office}."
    },
    {
      "places": [
        {
          "Home": "The house is nice, it has a small kitchen, a big living room, a nice bedroom and a big bathroom."
        },
        {
          "Office": "The office is small with a reception room and a bathroom."
        }
      ]
    },
    {
      "characters": [
        {
          "Buddy": "Buddy is a 10 years old Basset Hounds."
        },
        {
          "Richard": "Richard is a 40-years old man and is John's father."
        },
        {
          "Steven": "Steven is a 20-years old man and is John's brother."
        }
      ]
    },
    {
      "rules": [
        "When a character speaks, their dialogue must be preceded by their name, a colon, and a space, for example, 'John: Hello, how are you?'",
        "Movements and reactions must be in one sentence and in parentheses.",
        "Now we are at home with Buddy and Richard.",
        "The user is John."
      ]
    },
    {
      "welcomeMessage": "Welcome to this small universe. There are two places you can visit: your home and the office. Your name is John and you are at your home now, with your dog Buddy and your father Richard."
    }
  ]
}
```

The `system_prompt` key is defined in [src/public/strings.js](https://github.com/lrusso/LlamaWebServer/blob/main/src/public/strings.js).

## Suggested GGUF models

- [Llama 3.1 8B (8.54 GB)](https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q8_0.gguf?download=true)
- [Llama 3.1 8B (4.32 GB)](https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q3_K_L.gguf?download=true)
- [Llama 3.1 8B Uncensored (8.54 GB)](https://huggingface.co/bartowski/Llama-3.1-8B-Lexi-Uncensored-V2-GGUF/resolve/main/Llama-3.1-8B-Lexi-Uncensored-V2-Q8_0.gguf?download=true)
- [Llama 3.1 8B Uncensored (4.32 GB)](https://huggingface.co/bartowski/Llama-3.1-8B-Lexi-Uncensored-V2-GGUF/resolve/main/Llama-3.1-8B-Lexi-Uncensored-V2-Q3_K_L.gguf?download=true)

## Disclaimer

You are legally responsible for any damage that you could cause with this software when using it with an AI model.
