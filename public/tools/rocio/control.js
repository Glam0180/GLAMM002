import { render, defaults } from './scene.js'
const $ = id => document.getElementById(id);
function goHome(){ try{ if(window.top&&window.top!==window) window.top.location.href='/'; else window.location.href='/'; }catch(e){ window.location.href='/'; } }
$('mhouse').addEventListener('click',goHome); $('mclose').addEventListener('click',goHome); $('wclose').addEventListener('click',goHome);

/* ─────────── encaje del lienzo 3:4 en el viewport ─────────── */
const frameEl=$('frame'),viewportEl=$('viewport'),sidebarEl=$('sidebar'),winBarEl=document.querySelector('#viewport .win__bar');
const RW=1080,RH=1440;
function fitStage(){
  frameEl.style.width='';frameEl.style.height='';viewportEl.style.width='';
  if(window.matchMedia('(max-width: 768px)').matches) return;
  const sb=$('stage').getBoundingClientRect(),pad=20,bw=2,gap=5,sw=sidebarEl.offsetWidth,cw=bw*2,ch=winBarEl.offsetHeight+bw*2;
  const maxW=sb.width-8-pad*2-gap-sw-cw,maxH=sb.height-8-pad*2-ch;let h=maxH,w=h*RW/RH;if(w>maxW){w=maxW;h=w*RH/RW;}
  w=Math.max(120,Math.floor(w));h=Math.max(160,Math.floor(h));
  viewportEl.style.width=(w+cw)+'px';frameEl.style.width=(w+cw+gap+sw+pad*2)+'px';frameEl.style.height=(h+ch+pad*2)+'px';}
addEventListener('resize',fitStage); fitStage(); addEventListener('load',fitStage);
const settings = { ...defaults }
const canvas = $('poster')
const context = canvas.getContext('2d', { alpha: false })
const groups = [
  ['Óptica', [['lens','Ojo de pez',0,1,.01], ['squeeze','Compresión anamórfica (×)',.8,1.8,.01],
    ['cylinder','Panorámica cilíndrica',0,1,.01]]],
  ['Regadera', [['canTilt','Inclinación (°)',-22,55,1],['canTurn','Giro lateral (°)',-65,45,1]]],
  ['Cámara', [['pitch','Elevación (°)',12,36,1], ['altitude','Altura de cámara',.04,.55,.01],
    ['angle','Ángulo (°)',-26,26,1], ['zoom','Zoom',.72,1.24,.01]]],
  ['Estilo', [['facets','Facetas del metal',6,24,1], ['grain','Grano',0,1,.01], ['hue','Hue (°)',-180,180,1]]],
  ['Ritmo', [['showers','Caídas por loop',1,5,1], ['duration','Duración (s)',2,16,.5]]]
]
for (const [section,controls] of groups) {
  const heading = document.createElement('div')
  heading.className='y-sec'
  heading.textContent=section
  $('sliders').append(heading)
  for(const [key,label,min,max,step] of controls) {
    const row=document.createElement('label')
    row.className='y-row'
    row.innerHTML='<span class="y-lab"><span></span><output></output></span><input type="range">'
    const input=row.querySelector('input'), output=row.querySelector('output')
    row.querySelector('.y-lab span').textContent=label
    Object.assign(input,{min,max,step,value:settings[key]})
    function update() {
      settings[key]=Number(input.value)
      output.value=input.value
      input.style.setProperty('--val',(settings[key]-min)/(max-min)*100+'%')
      if(key==='hue') {
        const stops=[185,305,65].flatMap((h,i)=>[
          'hsl('+(h+settings.hue)+' 76% 60%) '+(i*100/3)+'%',
          'hsl('+(h+settings.hue)+' 76% 60%) '+((i+1)*100/3)+'%'
        ])
        output.style.borderImage='linear-gradient(90deg,'+stops.join(',')+') 1'
        output.style.borderBottom='4px solid'
      }
    }
    input.addEventListener('input',update)
    update()
    $('sliders').append(row)
  }
}
let playing=true, exporting=false, phase=0, previous=performance.now()
function frame(now) {
  if(playing && !exporting) phase=(phase+(now-previous)/(settings.duration*1000))%1
  previous=now
  if(!exporting) render(context,phase,settings)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
$('play').onclick=()=>{
  playing=!playing
  $('play').textContent=playing?'PAUSAR LOOP':'REANUDAR LOOP'
}
GlamRec.montar({contenedor:$('recSlot'),clase:'cam-btn',nombre:'rocio',manual:false,
  ancho:RW,alto:RH,aspecto:RW/RH,dibujar(ctx,w,h){ctx.drawImage(canvas,0,0,w,h)},
  alIniciar(){ $('bLoop').disabled=true },alTerminar(){ $('bLoop').disabled=false }})
$('bLoop').onclick=async()=>{
  if(exporting) return
  const btn=$('bLoop'), info=$('loopInfo')
  const params={...settings}, fps=60, total=params.duration*fps
  const status=msg=>{info.textContent=msg}
  const controls=[...document.querySelectorAll('#sidebar button, #sidebar input, #sidebar textarea')]
  const disabled=controls.map(el=>el.disabled)
  let encoder, failure
  exporting=true
  controls.forEach(el=>{el.disabled=true})
  try {
    if(!window.VideoEncoder) throw Error('Para exportar MP4 abre la herramienta en Chrome o Edge.')
    let config
    for(const codec of ['avc1.640033','avc1.4D0033','avc1.420033']) {
      const candidate={codec,width:RW,height:RH,framerate:fps,bitrate:40e6,avc:{format:'avc'}}
      if((await VideoEncoder.isConfigSupported(candidate)).supported){ config=candidate;break }
    }
    if(!config) throw Error('H.264 no está disponible. Puedes usar GRABAR.')
    const muxer=new Mp4Muxer.Muxer({target:new Mp4Muxer.ArrayBufferTarget(),
      video:{codec:'avc',width:RW,height:RH,frameRate:fps},fastStart:'in-memory'})
    encoder=new VideoEncoder({output:(chunk,meta)=>muxer.addVideoChunk(chunk,meta),error:e=>{failure=e}})
    encoder.configure(config)
    for(let i=0;i<total;i++) {
      if(failure) throw failure
      render(context,i/total,params)
      const video=new VideoFrame(canvas,{timestamp:Math.round(i*1e6/fps),duration:Math.round((i+1)*1e6/fps)-Math.round(i*1e6/fps)})
      try { encoder.encode(video,{keyFrame:i%fps===0}) } finally { video.close() }
      if(encoder.encodeQueueSize>6) await encoder.flush()
      if(i%6===0) {
        status('Exportando '+Math.floor(i/total*100)+' %')
        await new Promise(done=>setTimeout(done,0))
      }
    }
    await encoder.flush()
    muxer.finalize()
    const a=document.createElement('a'), url=URL.createObjectURL(new Blob([muxer.target.buffer],{type:'video/mp4'}))
    a.href=url;a.download='rocio-'+params.duration+'s.mp4';a.click()
    setTimeout(()=>URL.revokeObjectURL(url),60000)
    status('MP4 listo · '+total+' cuadros · 1080×1440')
  } catch(e) { status(e.message) }
  finally {
    if(encoder && encoder.state!=='closed') encoder.close()
    exporting=false
    controls.forEach((el,i)=>{el.disabled=disabled[i]})
  }
}


