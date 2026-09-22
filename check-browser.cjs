const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=9333','--enable-unsafe-swiftshader','--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'nancy-browser-')),'about:blank'],{windowsHide:true,stdio:'ignore'});
let socket;
(async()=>{
let pages;
for(let i=0;i<40;i++){try{pages=await (await fetch('http://127.0.0.1:9333/json')).json();break;}catch{await new Promise(r=>setTimeout(r,250));}}
if(!pages)throw Error('No se pudo iniciar Chrome');
socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.onopen=r);
let id=0;const pending=new Map();const errors=[];
socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});
const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true})).result.value;
await send('Runtime.enable');await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:'http://localhost:5500'});
await new Promise(r=>setTimeout(r,2200));
fs.mkdirSync('preview',{recursive:true});
fs.writeFileSync('preview/desktop.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
console.log('Initial:',await evaluate('JSON.stringify({title:document.title,photos:photoGroup.children.length,phrases:textGroup.children.length,width:document.documentElement.scrollWidth})'));
await evaluate("document.getElementById('start-button').click()");await new Promise(r=>setTimeout(r,1000));
console.log('Started:',await evaluate("JSON.stringify({started,controlsRemoved:!document.getElementById('controls'),audioReady:audio.readyState,audioPlaying:!audio.paused,portraitLoaded:document.querySelector('.nancy-portrait').naturalWidth>0})"));
fs.writeFileSync('preview/galaxy.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
await send('Page.navigate',{url:'http://localhost:5500'});await new Promise(r=>setTimeout(r,1200));
fs.writeFileSync('preview/mobile.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
console.log('Mobile:',await evaluate('JSON.stringify({width:innerWidth,contentWidth:document.documentElement.scrollWidth,canvasWidth:renderer.domElement.clientWidth})'));
await send('Emulation.setDeviceMetricsOverride',{width:375,height:667,deviceScaleFactor:1,mobile:true});
await new Promise(r=>setTimeout(r,200));
console.log('Small mobile:',await evaluate("JSON.stringify({buttonBottom:document.getElementById('start-button').getBoundingClientRect().bottom,height:innerHeight})"));
console.log('Runtime errors:',JSON.stringify(errors));if(errors.length)process.exitCode=1;
await send('Browser.close');socket.close();
})().catch(e=>{console.error(e);process.exitCode=1;socket?.close();browser.kill();});


