const fs = require('node:fs');
const source = fs.readFileSync('reference.html', 'utf8');
let scene = source.split('<script>')[2].split('</script>')[0];
scene = scene.replace("audio.querySelector('source').src=CONFIG.musica;", "audio.src=CONFIG.musica;");
scene = scene.replace('const WORD_SLOTS=150;', 'const WORD_SLOTS=64;');
scene = scene.replace('const PHOTO_COUNT=26;', 'const PHOTO_COUNT=18;');
scene = scene.replace('fontSize>24', 'fontSize>14');
scene = scene.replaceAll("'Indie Flower', cursive", "'Georgia', serif");
scene = scene.replace('let targetDist=300,currentDist=300,rotX=0.2,rotY=0;', 'let targetDist=440,currentDist=440,rotX=0.42,rotY=0;');
scene = scene.replace("addEventListener('mousedown'", "canvas.addEventListener('mousedown'").replace("addEventListener('touchstart'", "canvas.addEventListener('touchstart'").replace("addEventListener('wheel'", "canvas.addEventListener('wheel'");
scene = scene.replace("function onDown(e){dragging=true;", "function onDown(e){if(!started)return;dragging=true;");
scene = scene.replace('let t=0;', "let started=false;\nlet paused=matchMedia('(prefers-reduced-motion: reduce)').matches;\nlet t=0;\nlet lastFrame=0;");
scene = scene.replace('function tick(){requestAnimationFrame(tick);t+=0.01;', "function tick(now=0){requestAnimationFrame(tick);const delta=Math.min((now-lastFrame)/16.667,2);lastFrame=now;if(document.hidden)return;if(started&&!paused){t+=0.01*delta;");
scene = scene.replace('ring.rotation.z+=0.003;', 'ring.rotation.z+=0.003*delta;');
scene = scene.replaceAll('sp.userData.theta+=sp.userData.speed;', 'sp.userData.theta+=sp.userData.speed*delta;');
scene = scene.replace('  currentDist+=', '  }\n  currentDist+=');
scene = scene.slice(0, scene.indexOf('// ── Arranque:'));
scene += `
addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
async function playMusic(){try{await audio.play();document.getElementById('status').textContent='';}catch{document.getElementById('status').textContent='La música no está disponible. Puedes seguir explorando.';}}
document.getElementById('start-button').addEventListener('click',()=>{
  started=true;document.body.classList.add('exploring');
  document.getElementById('start-screen').inert=true;
  playMusic();document.querySelector('.brand').focus();
});
const letter=document.getElementById('letter');
document.getElementById('close-letter').addEventListener('click',()=>letter.close());
letter.addEventListener('click',e=>{if(e.target===letter){const r=letter.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)letter.close();}});
`;
fs.writeFileSync('galaxy.js', scene);

