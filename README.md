# Llama Web Server

This is a web server implementation of Llama that lets you run a GGUF model file locally. It includes a user interface that's similar to WhatsApp. You can use the default GGUF model file that is downloaded during the installation process or you can download a GGUF model file from [HuggingFace.co](https://huggingface.co) and place it in the `model` folder.

## How to run the server

- Run `npm install`
- Run `npm run download:q8` or `npm run download:q3` (for systems with limited RAM)
- Run `npm run start`
- Browse to `http://localhost`

## How to run the server using a different port

- Run `npm run start 8080`
- Browse to `http://localhost:8080`

## How to run the server in the background

- Run `npm install -g forever`
- Run `npm run forever`
- Browse to `http://localhost`
- To stop the server, run `npm run stop`

## How to force the light and dark modes

- Browse to `http://localhost/?lightmode`
- Browse to `http://localhost/?darkmode`

## How to set a custom context size

- Edit the [server.js](https://github.com/lrusso/LlamaWebServer/blob/main/src/server.js#L49) file.
- 4K context: replace `"auto"` with `4096`.
- 8K context: replace `"auto"` with `8192`.
- 16K context: replace `"auto"` with `16384`.

## How to launch the server on startup (MacOS)

- Run `nano ~/Library/LaunchAgents/com.lrusso.server.plist`
- Assuming that you have the server folder path in `/Users/lrusso/Server`, you must write:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.lrusso.server</string>

    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/lrusso/Server/src/server.js</string>
    </array>

    <key>WorkingDirectory</key>
    <string>/Users/lrusso/Server</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardErrorPath</key>
    <string>/dev/null</string>
    <key>StandardOutPath</key>
    <string>/dev/null</string>
</dict>
</plist>
```

- Run `chmod 644 ~/Library/LaunchAgents/com.lrusso.server.plist`
- Run `launchctl load ~/Library/LaunchAgents/com.lrusso.server.plist`

## Special keys:

| Action     | macOS Shortcut | Windows Shortcut | Safari Shortcut |
| :--------- | :------------: | :--------------: | :-------------: |
| Next reply |  Command + 1   |     Ctrl + 1     |    Ctrl + 1     |
| Regenerate |  Command + 2   |     Ctrl + 2     |    Ctrl + 2     |

## System prompt

The system prompt is defined in the [strings.js](https://github.com/lrusso/LlamaWebServer/blob/main/src/public/strings.js#L7) file.

## Disclaimer

You are legally responsible for any damage that you could cause with this software.
