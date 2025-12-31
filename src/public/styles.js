const BASE_STYLES = `
*{font-family:Arial;font-size:16px;font-family:ui-sans-serif, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"}
html,body{margin:0;padding:0;overscroll-behavior:none}
span{line-height:28px;display:inline-block;padding:10px;border-radius:10px;white-space:pre-wrap}
code{line-height:28px;display:block;padding:10px;border-radius:10px;white-space:pre-wrap}

.wallpaper{position:fixed;left:0;right:0;bottom:0;top:0;z-index:-1;background-image:url(background.png);background-size:412px 749px;background-repeat:repeat}

.header_container{position:fixed;left:0;right:0;top:0;height:64px;z-index:990;display:flex;align-items:center}
.header_image{float:left;margin-left:15px;margin-right:15px;border-radius:20px;width:40px;height:40px;background-image:url(favIcon512x512.png);background-size:40px;background-position:center center;background-repeat:no-repeat}
.header_name{float:left}

.content{display:block;margin-top:65px;padding-left:10px;padding-right:10px;padding-top:10px;overflow-y:auto;overflow-x:hidden}
.content::-webkit-scrollbar{height:8px;width:8px}
.content::-webkit-scrollbar-thumb{-webkit-border-radius:0;-webkit-box-shadow:0 1px 2px rgba(0, 0, 0, 0.75)}

.input_container{display:none;flex-grow:1;align-items:end;height:auto;margin:0 10px 10px 10px;padding:14px;border-radius:10px;box-shadow:0 5px 5px rgba(0,0,0,0.1)}
.input_textbox{flex-grow:1;resize:none;outline:none;border:0;line-height:normal !important}
.input_textbox:disabled{cursor:default}
.input_textbox::placeholder{opacity:0.4}
.input_send{display:block;margin-left:10px;margin-bottom:2px;cursor:default}
.input_send.active{cursor:pointer}

.actions_container{display:flex}
.action_button{display:flex;text-align:center;border-radius:10px;padding:12px;min-width:48px;min-height:48px;margin-right:10px;margin-bottom:10px;cursor:default;outline:0 solid;border:0;box-shadow:0 5px 5px rgba(0,0,0,0.1);white-space:nowrap;overflow:hidden;justify-content:center;align-items:center}
.action_button:focus{outline-width:2px;outline-style:solid}
.action_button.active{cursor:pointer}

.prompt_container{margin-bottom:10px;margin-left:10px;text-align:right;word-break:break-word}
.prompt_background{box-shadow:0 5px 5px rgba(0,0,0,0.1)}
.prompt_content{display:block}

.reply{display:table;margin-bottom:10px;word-break:break-word;box-shadow:0 5px 5px rgba(0,0,0,0.1)}

.highlighted{display:inline-block;padding-left:4px;padding-right:4px;border-radius:4px}

table{border-collapse:collapse;margin:10px 0}
table th,table td{border:1px solid silver;padding:8px}

.pointer{line-height:16px;display:inline-block;border-radius:6px;width:12px;height:12px;overflow:hidden;animation:processing 1s ease-in-out infinite}

.regenerate{display:block}
.speak{display:block}

@keyframes processing{0%{transform:scale(1)}50%{transform:scale(1.4)}100%{transform:scale(1)}}

@media screen and (min-width:800px) {
  body{margin-left:15vw;margin-right:15vw}
  .header_container{padding-left:15vw;padding-right:15vw}
}
`

const COLORS_LIGHT_MODE = `
body{background-color:#EFEAE2}
span,code{background-color:#ECECEC}
em{color:#808080}

.wallpaper{background-color:#EFEAE2;opacity:0.4}

.header_container{background-color:#F0F2F5;border-bottom:1px solid rgba(206,206,206,0.4)}
.header_image{background-color:#FFF;border:1px solid #E3E4E6}
.header_name{color:#000}

.content::-webkit-scrollbar{background:#F2F2F2}
.content::-webkit-scrollbar-thumb{background:#C8C8C8}
.content::-webkit-scrollbar-corner{background:#C8C8C8}

.input_container{background-color:#FFF;border:1px solid rgba(206,206,206,0.4)}
.input_textbox{background-color:#FFF}
.input_textbox:disabled{background-color:#FFF}
.input_send{fill:#C8C8C8}
.input_send.active{fill:#000}

.action_button{background-color:#FFF;color:#C8C8C8}
.action_button:focus{outline-color:#C8C8C8}
.action_button.active{color:#000}

.prompt_background{background-color:#D9FDD3 !important}

.reply{background-color:#FFF}

.highlighted{background-color:#ECECEC}

.pointer{background-color:#000}

.regenerate{fill:#C8C8C8}
.regenerate.active{fill:#000}
.speak{fill:#C8C8C8}
.speak.active{fill:#000}
`

const COLORS_DARK_MODE = `
body{background-color:#0B141A}
span,code{background-color:#2C1D0E !important;color:#9CDCFE !important}
em{color:#8D8D8D}

.wallpaper{background-color:#0B141A;opacity:0.06}

.header_container{background-color:#202C33;border-bottom:1px solid rgba(206,206,206,0.1)}
.header_image{background-color:#000;border:1px solid #353F46}
.header_name{color:#FFF;font-weight:bold}

.content::-webkit-scrollbar{background:#202C33}
.content::-webkit-scrollbar-thumb{background:#545B6D}
.content::-webkit-scrollbar-corner{background:#545B6D}

.input_container{background-color:#202C33;border:1px solid rgba(206,206,206,0.1)}
.input_textbox{background-color:#202C33;color:#FFF}
.input_textbox:disabled{background-color:#202C33}
.input_send{fill:rgba(206,206,206,0.2)}
.input_send.active{fill:#FFF}

.action_button{background-color:#202C33;color:rgba(206,206,206,0.2)}
.action_button:focus{outline-color:#858DA2}
.action_button.active{color:#FFF}

.prompt_background{background-color:#005C4B !important;color:#FFF !important}

.reply{background-color:#202C33 !important;color:#FFF !important}

.highlighted{background-color:#2C1D0E !important}

.pointer{background-color:#FFF}

.regenerate{fill:rgba(206,206,206,0.2)}
.regenerate.active{fill:#FFF}
.speak{fill:rgba(206,206,206,0.2)}
.speak.active{fill:#FFF}
`

const STYLES_LIGHT_MODE = BASE_STYLES + COLORS_LIGHT_MODE
const STYLES_DARK_MODE = BASE_STYLES + COLORS_DARK_MODE

const STYLES_ALL =
  `
@media (prefers-color-scheme: light) {` +
  STYLES_LIGHT_MODE +
  `}

@media (prefers-color-scheme: dark) {` +
  STYLES_DARK_MODE +
  `}
`
