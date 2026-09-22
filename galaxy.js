
// ================= Título fijo + música (arranca recién al tocar) =================
document.getElementById('main-title').textContent=CONFIG.titulo;
const audio=document.getElementById('audio');
audio.src=CONFIG.musica;
audio.load();

// ================= Escena =================
const canvas=document.getElementById('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.setSize(innerWidth,innerHeight);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,5000);
let targetDist=440,currentDist=440,rotX=0.42,rotY=0;

// Fondo: negro solido + el campo de estrellas generado abajo. La textura
// de nebulosa externa que traia el archivo original apuntaba a una URL de
// GitHub que ya no existe (404 - nunca se veia, ni siquiera antes de este
// cambio) - se quita en vez de dejar una dependencia externa rota.

// Estrellas
(function makeStars(count=2000,spread=3000){
  const g=new THREE.BufferGeometry();
  const pos=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const r=spread*(0.3+Math.random()*0.7);
    const th=Math.random()*Math.PI*2;
    const ph=Math.acos(2*Math.random()-1);
    pos[i*3+0]=r*Math.sin(ph)*Math.cos(th);
    pos[i*3+1]=r*Math.cos(ph);
    pos[i*3+2]=r*Math.sin(ph)*Math.sin(th);
  }
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  scene.add(new THREE.Points(g,new THREE.PointsMaterial({size:1.5,color:0xffffff,depthWrite:false})));
})();

// Núcleo tipo "agujero negro" (oscuro y opaco, para que el anillo resalte por contraste)
const coreMat=new THREE.MeshPhongMaterial({color:0x030303,transparent:true,opacity:0.92,shininess:30});
const core=new THREE.Mesh(new THREE.SphereGeometry(40,64,64),coreMat);
scene.add(core);

// El título ahora vive en la cabecera fija (#main-title, ver DEDICA:CONFIG
// mas arriba) en vez de un sprite 3D en el centro - mas legible y
// consistente con el resto del catalogo.

// Glow exterior (reducido, para que el anillo se note más)
const GLOW_BASE=360;
function makeGlow(size=768,c1='255,235,130',c2='255,180,0'){
  const c=document.createElement('canvas');c.width=c.height=size;
  const g=c.getContext('2d');
  const grad=g.createRadialGradient(size/2,size/2,size*0.05,size/2,size/2,size*0.5);
  grad.addColorStop(0,'rgba('+c1+',0.55)');
  grad.addColorStop(0.5,'rgba('+c2+',0.25)');
  grad.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=grad;g.fillRect(0,0,size,size);
  return new THREE.CanvasTexture(c);
}
const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:makeGlow(),transparent:true,depthWrite:false}));
glow.scale.set(GLOW_BASE,GLOW_BASE,1);
scene.add(glow);

// Anillo único (antes eran 3 anillos separados con huecos reales entre
// ellos). Sigue siendo un solo disco continuo (42-116, sin huecos), pero
// ahora con textura de franjas finas superpuestas al degradado de base -
// como los anillos de Saturno, que se ven "en capas" por dentro sin
// separarse en piezas distintas.
function ringTexture(size=1024){
  const c=document.createElement('canvas');c.width=c.height=size;
  const g=c.getContext('2d');g.translate(size/2,size/2);
  const rInner=size*0.205,rOuter=size*0.49;
  // Base: un solo degradado continuo de borde a borde, sin apagarse hacia
  // el borde exterior, para que el anillo se vea denso y solido.
  const grd=g.createRadialGradient(0,0,rInner,0,0,rOuter);
  grd.addColorStop(0.00,'rgba(255,255,245,1)');
  grd.addColorStop(0.30,'rgba(255,235,120,1)');
  grd.addColorStop(0.65,'rgba(255,200,40,0.95)');
  grd.addColorStop(1.00,'rgba(255,160,0,0.85)');
  g.fillStyle=grd;
  g.beginPath();g.arc(0,0,rOuter,0,Math.PI*2);g.arc(0,0,rInner,0,Math.PI*2,true);g.closePath();g.fill();

  // Franjas concentricas finas por encima del degradado base - varian el
  // brillo (mas claras u oscuras), nunca la opacidad hasta 0, asi que no
  // dejan huecos ni se leen como anillos separados, solo como textura.
  const bandCount=26;
  for(let i=0;i<bandCount;i++){
    const r=rInner+(rOuter-rInner)*(i/(bandCount-1));
    const dark=i%3===0;
    g.beginPath();
    g.arc(0,0,r,0,Math.PI*2);
    g.lineWidth=(rOuter-rInner)/bandCount*(0.55+Math.random()*0.35);
    g.strokeStyle=dark?'rgba(110,60,0,0.20)':'rgba(255,255,225,0.16)';
    g.stroke();
  }
  return new THREE.CanvasTexture(c);
}
const ring=new THREE.Mesh(new THREE.RingGeometry(42,116,160),new THREE.MeshBasicMaterial({map:ringTexture(),transparent:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,opacity:1}));
ring.rotation.x=Math.PI/2;
scene.add(ring);

// Palabras alrededor: frases del Día de las Flores Amarillas (min 1, se repiten
// ciclicamente hasta llenar las 150 posiciones que la escena ya reserva,
// sin importar cuántas haya dejado el cliente - ver schema.json).
const frasesBase=(Array.isArray(CONFIG.frases)&&CONFIG.frases.length)?CONFIG.frases:DEFAULTS.frases;
const WORD_SLOTS=64;
const WORDS=Array.from({length:WORD_SLOTS},(_,i)=>frasesBase[i%frasesBase.length]);
function makeTextTexture(text,color){
  const c=document.createElement('canvas');c.width=512;c.height=128;
  const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#fff';ctx.shadowColor=color;ctx.shadowBlur=30;
  // Antes el tamaño de fuente era fijo (60px) sin importar el largo de la
  // frase - una frase larga (con emoji, que ya de por si ocupa bastante
  // ancho) se salia del lienzo de 512px y quedaba cortada a la mitad. Ahora
  // el tamaño se reduce hasta que la frase completa entra, con un piso de
  // 24px para que no se vuelva ilegible.
  const maxWidth=c.width-48;
  let fontSize=60;
  ctx.font=fontSize+"px 'Georgia', serif";
  while(ctx.measureText(text).width>maxWidth&&fontSize>24){
    fontSize-=2;
    ctx.font=fontSize+"px 'Georgia', serif";
  }
  ctx.fillText(text,c.width/2,c.height/2);
  return new THREE.CanvasTexture(c);
}
const COLORS=['#ffd700','#ffe066','#ffcc33','#ffb347','#fff2b0','#ffaa00','#f4c430','#e6b800','#ffdb58','#f0c419'];
const textGroup=new THREE.Group();scene.add(textGroup);
// Se espera a que 'Indie Flower' termine de cargar antes de dibujar las
// frases en canvas - a diferencia del texto normal del DOM (el navegador ya
// resuelve el "parpadeo" de fuente por su cuenta), un canvas dibuja con la
// fuente que este disponible EN ESE INSTANTE: sin esto, las 150 frases
// quedaban grabadas para siempre con la tipografia de respaldo (Arial) si
// la fuente todavia no habia terminado de bajar en el momento exacto en que
// corria este bucle.
document.fonts.load("40px 'Indie Flower'").catch(()=>{}).then(()=>{
  for(let i=0;i<WORDS.length;i++){
    const tex=makeTextTexture(WORDS[i],COLORS[i%COLORS.length]);
    const mat=new THREE.SpriteMaterial({map:tex,transparent:true});
    const sp=new THREE.Sprite(mat);
    sp.scale.set(68,21.8,1);
    const phi=Math.acos(2*Math.random()-1);const theta=Math.random()*Math.PI*2;
    const r=150+Math.random()*120;
    sp.position.set(r*Math.sin(phi)*Math.cos(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(theta));
    sp.userData={phi:phi,theta:theta,radius:r,speed:0.001+Math.random()*0.001};
    textGroup.add(sp);
  }
});

// Fotos del cliente flotando de forma individual (reemplazan a los emojis de
// la version original). Minimo 1, maximo 3 (plantilla gratuita, ver
// schema.json) - se reparten ciclicamente (i % cantidad) entre las 26
// posiciones fijas que la escena ya reserva, igual que antes hacian los
// emojis, asi que menos fotos simplemente se repiten mas seguido sin que la
// escena se vea mas vacia.
const fotosBase=(Array.isArray(CONFIG.fotos)&&CONFIG.fotos.length)?CONFIG.fotos:DEFAULTS.fotos;
function makePhotoSprite(url,size){
  const c=document.createElement('canvas');c.width=c.height=256;
  const tex=new THREE.CanvasTexture(c);
  const mat=new THREE.SpriteMaterial({map:tex,transparent:true});
  const sp=new THREE.Sprite(mat);
  sp.scale.set(size,size,1);
  const img=new Image();img.crossOrigin='anonymous';
  img.onload=()=>{
    const ctx=c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);
    // "contain": la foto entra completa sin recortar ningun borde (lo que
    // sobra en el lienzo cuadrado queda transparente); el sprite se encoge
    // en el eje sobrante para que no se note como un marco cuadrado vacio.
    const s=Math.min(c.width/img.width,c.height/img.height);
    ctx.drawImage(img,(c.width-img.width*s)/2,(c.height-img.height*s)/2,img.width*s,img.height*s);
    tex.needsUpdate=true;
    const aspect=img.naturalWidth/img.naturalHeight;
    const aX=Math.min(1,aspect),aY=Math.min(1,1/aspect);
    sp.scale.set(size*aX,size*aY,1);
  };
  img.onerror=()=>{};
  img.src=url;
  return sp;
}
const photoGroup=new THREE.Group();scene.add(photoGroup);
const PHOTO_COUNT=18;
for(let i=0;i<PHOTO_COUNT;i++){
  const url=fotosBase[i%fotosBase.length];
  const size=28+Math.random()*20;
  const sp=makePhotoSprite(url,size);
  const phi=Math.acos(2*Math.random()-1);const theta=Math.random()*Math.PI*2;
  const r=140+Math.random()*170;
  sp.position.set(r*Math.sin(phi)*Math.cos(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(theta));
  sp.userData={phi:phi,theta:theta,radius:r,speed:0.0006+Math.random()*0.0012};
  photoGroup.add(sp);
}

// Controles cámara — dirección corregida: ahora sigue el lado hacia donde deslizas
let dragging=false,lastX=0,lastY=0;
function onDown(e){if(!started)return;dragging=true;const t=e.touches?e.touches[0]:e;lastX=t.clientX;lastY=t.clientY;}
function onMove(e){if(!dragging)return;const t=e.touches?e.touches[0]:e;const dx=(t.clientX-lastX)/innerWidth;const dy=(t.clientY-lastY)/innerHeight;rotY-=dx*5;rotX=Math.max(-1.2,Math.min(1.2,rotX+dy*3.5));lastX=t.clientX;lastY=t.clientY;}
function onUp(){dragging=false;}
canvas.addEventListener('mousedown',onDown);addEventListener('mousemove',onMove);addEventListener('mouseup',onUp);
canvas.addEventListener('touchstart',onDown,{passive:true});addEventListener('touchmove',onMove,{passive:true});addEventListener('touchend',onUp,{passive:true});
canvas.addEventListener('wheel',(e)=>{targetDist+=e.deltaY*0.25;targetDist=Math.max(160,Math.min(600,targetDist));},{passive:true});

// Zoom con pellizco en móviles
let pinch=0;
addEventListener('touchmove',(e)=>{
  if(e.touches && e.touches.length===2){
    e.preventDefault();
    const dx=e.touches[0].clientX-e.touches[1].clientX;
    const dy=e.touches[0].clientY-e.touches[1].clientY;
    const d=Math.hypot(dx,dy);
    if(pinch){targetDist+=(pinch-d)*0.5;targetDist=Math.max(160,Math.min(600,targetDist));}
    pinch=d;
  }
},{passive:false});
addEventListener('touchend',()=>{pinch=0;},{passive:true});

// Animación
let started=false;
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
let t=0;
let lastFrame=0;
function tick(now=0){requestAnimationFrame(tick);const delta=Math.min((now-lastFrame)/16.667,2);lastFrame=now;if(document.hidden)return;if(started&&!paused){t+=0.01*delta;
  ring.rotation.z+=0.003*delta;
  glow.scale.set(GLOW_BASE*(1+Math.sin(t*0.4)*0.03),GLOW_BASE*(1+Math.sin(t*0.4)*0.03),1);
  const s=1.0+0.05*Math.sin(t*3); // latido
  core.scale.set(s,s,s);
  textGroup.children.forEach(sp=>{
    sp.material.opacity=0.8+0.2*Math.sin(t*2);
    sp.userData.theta+=sp.userData.speed*delta;
    sp.position.x=sp.userData.radius*Math.sin(sp.userData.phi)*Math.cos(sp.userData.theta);
    sp.position.z=sp.userData.radius*Math.sin(sp.userData.phi)*Math.sin(sp.userData.theta);
  });
  photoGroup.children.forEach(sp=>{
    sp.material.opacity=0.85+0.15*Math.sin(t*2+sp.userData.radius);
    // Sin rotacion propia: a diferencia de un emoji (simetrico, giraba bien
    // como si fuera un pinwheel), una foto real con forma reconocible se ve
    // rara/como "estirada" al girar sobre su propio eje en ciertos angulos -
    // se quita, la foto solo orbita y flota, se queda siempre derecha.
    sp.userData.theta+=sp.userData.speed*delta;
    sp.position.x=sp.userData.radius*Math.sin(sp.userData.phi)*Math.cos(sp.userData.theta);
    sp.position.z=sp.userData.radius*Math.sin(sp.userData.phi)*Math.sin(sp.userData.theta);
  });
  }
  currentDist+=(targetDist-currentDist)*0.06;
  const cx=Math.cos(rotX),sx=Math.sin(rotX);const cy=Math.cos(rotY),sy=Math.sin(rotY);
  camera.position.set(currentDist*sy*cx,currentDist*sx,currentDist*cy*cx);camera.lookAt(0,0,0);
  renderer.render(scene,camera);
}
tick();


addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
const musicButton=document.getElementById('music-toggle');
function syncMusic(){if(!audio.paused)document.getElementById('status').textContent='';musicButton.textContent=audio.paused?'♫ Activar música':'♫ Silenciar';musicButton.setAttribute('aria-pressed',String(!audio.paused));}
audio.addEventListener('play',syncMusic);audio.addEventListener('pause',syncMusic);
async function playMusic(){try{await audio.play();}catch{document.getElementById('status').textContent='La música no está disponible. Puedes seguir explorando.';}syncMusic();}
document.getElementById('start-button').addEventListener('click',()=>{
  started=true;document.body.classList.add('exploring');
  document.getElementById('start-screen').inert=true;
  document.getElementById('controls').hidden=false;
  playMusic();document.getElementById('letter-button').focus();
});
musicButton.addEventListener('click',()=>{if(audio.paused)playMusic();else audio.pause();});
const motionButton=document.getElementById('motion-toggle');
function syncMotion(){motionButton.textContent=paused?'▷ Animar':'Ⅱ Pausar';motionButton.setAttribute('aria-pressed',String(paused));}
syncMotion();motionButton.addEventListener('click',()=>{paused=!paused;syncMotion();});
document.getElementById('reset-button').addEventListener('click',()=>{targetDist=440;rotX=.42;rotY=0;});
const letter=document.getElementById('letter');
document.getElementById('letter-button').addEventListener('click',()=>letter.showModal());
document.getElementById('close-letter').addEventListener('click',()=>letter.close());
letter.addEventListener('click',e=>{if(e.target===letter){const r=letter.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)letter.close();}});
