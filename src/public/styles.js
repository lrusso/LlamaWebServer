const STYLES_LIGHT_MODE = `
*{font-family:Arial;font-size:16px;font-family:ui-sans-serif, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"}
html,body{margin:0;padding:0}
body{opacity:0}
span,code{line-height:28px;display:inline-block;padding:10px;border-radius:10px;white-space:pre-wrap;background-color:#ececec}
.wallpaper_layer{position:fixed;left:0;right:0;top:0;bottom:0;z-index:-99;background-color:#efeae2}
#wallpaper{position:fixed;left:0;right:0;bottom:0;top:0;z-index:-1;background-color:#efeae2;background-image:url(background.png);background-size:412px 749px;background-repeat:repeat;opacity:0.4}
#content{position:fixed;left:0;right:0;top:65px;bottom:65px;padding:10px;overflow-y:auto;overflow-x:hidden}
#content::-webkit-scrollbar{height:8px;width:8px;background:#F2F2F2}
#content::-webkit-scrollbar-thumb{background:#C8C8C8;-webkit-border-radius:0;-webkit-box-shadow:0px 1px 2px rgba(0, 0, 0, 0.75)}
#content::-webkit-scrollbar-corner{background: #C8C8C8}
#inputbox{width:100%;border:0;resize:none;outline:none;font-size:16px;padding:0;margin:0}
#inputbox::placeholder{opacity:0.4}
#inputbox:disabled{background-color:#ececec}
.action_button{display:block;text-align:center;border:1px solid #AAAAAA;height:40px;background-color:#C8C8C8;border-radius:5px;padding-left:12px;padding-right:12px;cursor:pointer;outline:0px solid #C8C8C8;color:black}
.action_button:focus{outline:2px solid #C8C8C8}
.input_background{position:fixed;left:0;right:0;bottom:0;height:64px;z-index:-1;background-color:#f0f2f5;border-top:1px solid rgba(206,206,206,0.4)}
.input_wrapper{position:fixed;left:0;right:0;margin-left:10px;margin-right:10px;bottom:9px;padding-top:14px;padding-bottom:10px;padding-left:13px;padding-right:13px;border-radius:10px;background-color:white}
.agent_fullscreen{position:fixed;left:0;right:0:top:0;bottom:0;z-index:999;width:100%;height:100%;display:none;background-color:black;background-repeat:no-repeat;background-size:contain;background-position:center center}
.agent_background{position:fixed;left:0;right:0;top:0;height:64px;z-index:-1;background-color:#f0f2f5;border-bottom:1px solid rgba(206,206,206,0.4)}
.agent_container{position:fixed;left:0;right:0;top:0;height:64px;display:flex;align-items:center}
.agent_image{float:left;background-color:black;margin-left:15px;margin-right:15px;border-radius:20px;width:40px;height:40px;background-image:url(app.png);background-size:40px;background-position:center center;background-repeat:no-repeat;cursor:pointer;border:1px solid #E3E4E6}
.agent_name{float:left;color:black}
.prompt{margin-bottom:10px;margin-left:10px;text-align:right;word-break:break-word}
.prompt_background{background-color:#d9fdd3 !important;box-shadow:0 5px 5px rgba(0,0,0,0.1)}
.prompt_content{display:block}
.reply{display:table;margin-bottom:10px;background-color:white;word-break:break-word;box-shadow:0 5px 5px rgba(0,0,0,0.1)}
.highlighted{background-color:#ececec;display:inline-block;padding-left:4px;padding-right:4px;border-radius:4px}
#pointer{line-height:16px;display:inline-block;background-color:black;border-radius:6px;width:12px;height:12px;overflow:hidden}
.moving{animation:processing 1s ease-in-out infinite}
@keyframes processing{0%{transform:scale(1)}50%{transform:scale(1.4)}100%{transform:scale(1)}}
@media screen and (min-width:800px) {
  #content{padding-left:15vw;padding-right:15vw}
  #inputbox{left:15vw;right:15vw}
  .input_wrapper{left:15vw;right:15vw}
  .agent_container{left:15vw;right:15vw}
}
`

const STYLES_DARK_MODE = `
*{font-family:Arial;font-size:16px;font-family:ui-sans-serif, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"}
html,body{margin:0;padding:0;background-color:#121317}
body{opacity:0}
span,code{line-height:28px;display:inline-block;padding:10px;border-radius:10px;white-space:pre-wrap;background-color:#2c1d0e !important;color:9cdcfe !important}
.wallpaper_layer{position:fixed;left:0;right:0;top:0;bottom:0;z-index:-99;background-color:#0b141a}
#wallpaper{position:fixed;left:0;right:0;bottom:0;top:0;z-index:-1;background-color:#0b141a;background-image:url(background.png);background-size:412px 749px;background-repeat:repeat;opacity:0.06}
#content{position:fixed;left:0;right:0;top:65px;bottom:65px;padding:10px;overflow-y:auto;overflow-x:hidden}
#content::-webkit-scrollbar{height:8px;width:8px;background:#202c33}
#content::-webkit-scrollbar-thumb{background:#545b6d;-webkit-border-radius:0;-webkit-box-shadow:0px 1px 2px rgba(0, 0, 0, 0.75)}
#content::-webkit-scrollbar-corner{background: #545b6d}
#inputbox{width:100%;border:0;resize:none;outline:none;font-size:16px;padding:0;margin:0;background-color:#121317;color:white}
#inputbox::placeholder{opacity:0.4}
#inputbox:disabled{background-color:#282b34}
.action_button{display:block;text-align:center;border:1px solid #616266;height:40px;background-color:#545b6d;border-radius:5px;padding-left:12px;padding-right:12px;cursor:pointer;outline:0px solid #858da2;color:white}
.action_button:focus{outline:2px solid #858da2}
.input_background{position:fixed;left:0;right:0;bottom:0;height:64px;z-index:-1;background-color:#202c33;border-top:1px solid rgba(206,206,206,0.1)}
.input_wrapper{position:fixed;left:0;right:0;margin-left:10px;margin-right:10px;bottom:9px;padding-top:14px;padding-bottom:10px;padding-left:13px;padding-right:13px;border-radius:10px;background-color:#121317}
.agent_fullscreen{position:fixed;left:0;right:0:top:0;bottom:0;z-index:999;width:100%;height:100%;display:none;background-color:black;background-repeat:no-repeat;background-size:contain;background-position:center center}
.agent_background{position:fixed;left:0;right:0;top:0;height:64px;z-index:-1;background-color:#202c33;border-bottom:1px solid rgba(206,206,206,0.1)}
.agent_container{position:fixed;left:0;right:0;top:0;height:64px;display:flex;align-items:center}
.agent_image{float:left;background-color:black;margin-left:15px;margin-right:15px;border-radius:20px;width:40px;height:40px;background-image:url(app.png);background-size:40px;background-position:center center;background-repeat:no-repeat;cursor:pointer;border:1px solid #353F46}
.agent_name{float:left;color:white;font-weight:bold}
.prompt{margin-bottom:10px;margin-left:10px;text-align:right;word-break:break-word}
.prompt_background{background-color:#005c4b !important;color:white !important}
.prompt_content{display:block}
.reply{display:table;margin-bottom:10px;background-color:#202c33 !important;color:white !important;word-break:break-word}
.highlighted{background-color:#2c1d0e !important;display:inline-block;padding-left:4px;padding-right:4px;border-radius:4px}
#pointer{line-height:16px;display:inline-block;background-color:white;border-radius:6px;width:12px;height:12px;overflow:hidden}
.moving{animation:processing 1s ease-in-out infinite}
@keyframes processing{0%{transform:scale(1)}50%{transform:scale(1.4)}100%{transform:scale(1)}}
@media screen and (min-width:800px) {
  #content{padding-left:15vw;padding-right:15vw}
  #inputbox{left:15vw;right:15vw}
  .input_wrapper{left:15vw;right:15vw}
  .agent_container{left:15vw;right:15vw}
}
`

const STYLES_ALL =
  `
@media (prefers-color-scheme: light) {` +
  STYLES_LIGHT_MODE +
  `}

@media (prefers-color-scheme: dark) {` +
  STYLES_DARK_MODE +
  `}
`
