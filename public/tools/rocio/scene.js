// Coordenadas de jardín: Y vertical, Z alejándose de la lente.
const TAU = Math.PI * 2
const { sin, cos, hypot } = Math
export const defaults = { lens: .58, altitude: .18, angle: -8, zoom: 1, grain: .23,
  squeeze: 1, cylinder: 0, pitch: 22, canTilt: 19, canTurn: -25, canSize:1,
  blockSize:1, blocks:6, water:94, spread:1, spin:1, motionHue:64, emotionHue:313, ascii:1, skyCycles:1,
  facets: 12, hue: 0, duration: 8, showers: 2 }
function seeded(seed) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296)
}
const random = seeded(1989)
const flowers = Array.from({length: 285}, (_, i) => {
  const z = .45 + random() ** 1.2 * 13
  return { x: (random() - .5) * (1.8 * z + 1.4), z,
    h: .2 + random() ** 2 * (i % 4 ? .72 : 1.6),
    size: .045 + random() * .085, tilt: random(), seed: random() * TAU }
}).sort((a,b) => b.z - a.z)
const drops = Array.from({length: 100}, () => ({
  phase: random(), spread: random() - .5, drift: random() - .5
}))
const rainRandom=seeded(337)
const drizzle=Array.from({length:180},()=>({
  phase:rainRandom(),spread:rainRandom()-.5,drift:rainRandom()-.5
}))
const grass = Array.from({length: 1100}, () => {
  const z=.10+random()**1.6*9
  return {x:(random()-.5)*(z*2.8+.8),z,h:.07+random()*.33,lean:(random()-.5)*.38}
}).sort((a,b)=>b.z-a.z)
// Una segunda capa de flores bajas cubre la tierra que se ve bajo la lente.
const gardenRandom = seeded(2719)
const lowFlowers=Array.from({length:78},()=>{
  const z=.28+gardenRandom()*1.9
  return {x:(gardenRandom()-.5)*(2.3*z+1),z,h:-.13+gardenRandom()*.25,
    size:.02+gardenRandom()*.032,tilt:gardenRandom(),seed:gardenRandom()*TAU}
})
const plants=[
  ...[...flowers,...lowFlowers].map(f=>({z:f.z,flower:f})),
  ...grass.map(b=>({z:b.z,blade:b}))
].sort((a,b)=>b.z-a.z)
const cloudBanks=[
  [-4.1,12.1,9,1.4], [3.7,10.2,10,1.7], [-2.3,4.5,12,1], [6,5.7,13,1.4]
]
const cloudRim=[[-1.8,0],[-1.56,.27],[-1.18,.31],[-.95,.61],[-.54,.65],
  [-.27,.95],[.17,1],[.51,.78],[.63,.53],[1,.59],[1.35,.38],[1.41,.23],
  [1.78,.17],[1.96,-.04],[1.48,-.22],[.65,-.31],[-.19,-.26],[-1,-.25]]
const noise = document.createElement('canvas')
noise.width = noise.height = 192
const noiseCtx = noise.getContext('2d')
const pixels = noiseCtx.createImageData(192,192)
for (let i=0; i<pixels.data.length; i+=4) {
  const n = random()*255
  pixels.data.set([n,n,n,255],i)
}
noiseCtx.putImageData(pixels,0,0)
const posterTexture = new WeakMap()
// Tramas neutras: la luz de los glifos conserva el tono elegido para el cielo.
function asciiLayer(cloud) {
  const tile=document.createElement('canvas')
  tile.width=cloud ? 288 : 768
  tile.height=cloud ? 144 : 1536
  const ink=tile.getContext('2d'), randomGlyph=seeded(cloud?620:207)
  const alphabet='.:+~=ox0B8#$@'
  ink.font=cloud ? 'bold 16px monospace' : 'bold 13px monospace'
  for(let y=0;y<tile.height;y+=16) {
    for(let x=0;x<tile.width;x+=12) {
      const a=TAU*x/tile.width
      const wave=sin(a+sin(y*.012)*2)+cos(y*.033+a)+.45*sin(3*a-y*.023)
      const density=Math.min(1,Math.max(0,(wave-.15)*.55))
      const pick=randomGlyph()
      if(!cloud && pick>.09+density*.85) continue
      const value=cloud ? .12+.70*density+.16*pick : density
      ink.fillStyle=cloud ? 'rgba(0,0,0,'+(.28+.40*value)+')' : 'rgba(255,255,255,'+(.15+.49*density)+')'
      ink.fillText(alphabet[Math.floor(value*(alphabet.length-1))],x,y+13)
    }
  }
  return tile
}
const skyGlyphs=asciiLayer(false), cloudGlyphs=asciiLayer(true)

export function render(ctx, phase, p) {
  phase%=1
  const W = 1080, H = 1440, t = phase * TAU
  ctx.save()
  ctx.scale(ctx.canvas.width/W,ctx.canvas.height/H)
  const color = (h,s,l) => 'hsl(' + (h+p.hue) + ' ' + s + '% ' + l + '%)'
  const gradient = ctx.createLinearGradient(0,0,0,H)
  gradient.addColorStop(0,color(193,92,43))
  gradient.addColorStop(.46,color(181,88,61))
  gradient.addColorStop(.78,color(66,76,75))
  gradient.addColorStop(1,color(87,55,22))
  ctx.fillStyle = gradient
  ctx.fillRect(0,0,W,H)
  const skyPhase=phase*p.skyCycles%1
  ctx.save()
  ctx.globalAlpha=p.ascii
  for(let x=(skyPhase-1)*skyGlyphs.width;x<W;x+=skyGlyphs.width) {
    ctx.drawImage(skyGlyphs,x,-36+6*cos(t))
  }
  ctx.restore()
  const roll = p.angle*Math.PI/180
  const pitch = p.pitch*Math.PI/180
  ctx.translate(540,0)
  ctx.scale(1/p.squeeze,1)
  ctx.translate(-540,0)
  function project([x,y,z]) {
    y -= p.altitude
    const depth = z*cos(pitch)+y*sin(pitch)
    const up = y*cos(pitch)-z*sin(pitch)
    const r = hypot(x,up)
    const perspective = 1/Math.max(.24,depth)
    const fish = Math.atan2(r,depth)/Math.max(r,.0001)
    const scale = 880*p.zoom*((1-p.lens)*perspective+p.lens*fish)
    const focal=880*p.zoom
    const horiz=x*scale*(1-p.cylinder)+focal*Math.atan2(x,depth)*p.cylinder
    const vert=up*(scale*(1-p.cylinder)+focal/Math.max(.24,hypot(x,depth))*p.cylinder)
    return [540+horiz*cos(roll)+vert*sin(roll),660+horiz*sin(roll)-vert*cos(roll),scale]
  }
  function polygon(points,fill) {
    ctx.beginPath()
    for (let i=0;i<points.length;i++) {
      if (i) ctx.lineTo(points[i][0],points[i][1])
      else ctx.moveTo(points[i][0],points[i][1])
    }
    ctx.closePath()
    ctx.fillStyle=fill
    ctx.fill()
  }
  function flower(f) {
    const {x,z,h,seed,size}=f
    const sway=.065*sin(t+seed)*h
    const base=project([x,-.22,z])
    const head=project([x+sway+.11*sin(seed)*h,h,z])
    const s=head[2]*size
    if (Math.abs(head[0]-540)>540*p.squeeze+s*3) return
    const mid=[(base[0]+head[0])*.5+s*.55,(base[1]+head[1])*.5]
    const thickness=Math.max(.65,s*.065)
    ctx.fillStyle=color(83+9*sin(seed),52,24+6*cos(seed))
    ctx.beginPath(); ctx.moveTo(base[0],base[1])
    ctx.quadraticCurveTo(mid[0]-thickness,mid[1],head[0]-thickness,head[1])
    ctx.lineTo(head[0]+thickness,head[1])
    ctx.quadraticCurveTo(mid[0]+thickness,mid[1],base[0],base[1]);ctx.fill()
    for(let k=0;k<3;k++) {
      const u=.05+k*.26, side=k%2 ? -1 : 1
      const lx=base[0]*(1-u)+head[0]*u, ly=base[1]*(1-u)+head[1]*u
      const tip=[lx+side*s*(2.3+f.tilt),ly-s*1.55]
      const ridge=[lx+side*s,ly-s*.87]
      polygon([[lx,ly],[lx+side*s*.85,ly-s*1.07],tip,ridge],color(77,69,46))
      polygon([[lx,ly],ridge,tip,[lx+side*s*1.3,ly-s*.12]],color(99,45,30))
    }
    ctx.save(); ctx.translate(head[0],head[1]); ctx.rotate(.48*sin(seed)+roll)
    ctx.scale(s,s*(.36+.55*f.tilt))
    const count=9+Math.floor(f.tilt*4)
    for(let j=0;j<count;j++) {
      ctx.save(); ctx.rotate(TAU*j/count+seed)
      const tip=1.58+.22*sin(j+seed)
      polygon([[.18,0],[.8,-.29],[tip,-.2],[tip+.12,.06],[1.1,.27],[.45,.18]],color(56,52,83+10*sin(j+seed)))
      polygon([[.32,.06],[tip,-.06],[1.24,.16]],color(303,30,83))
      ctx.restore()
    }
    ctx.fillStyle=color(35,100,48);ctx.beginPath();ctx.ellipse(0,0,.49,.5,0,0,TAU);ctx.fill()
    ctx.fillStyle=color(48,100,62);ctx.beginPath();ctx.ellipse(-.08,-.11,.32,.25,0,0,TAU);ctx.fill()
    ctx.restore()
  }
  function drawCloud([x,y,z,size],offset) {
    const cloudPoint=([a,b])=>{
      const pt=project([x+a*size,y+b*size,z+.12*a])
      pt[0]+=offset
      return pt
    }
    const edge=cloudRim.map(cloudPoint)
    if(edge.every(v=>v[0]<540-540*p.squeeze)||edge.every(v=>v[0]>540+540*p.squeeze)) return
    const centers=[[-.95,.13],[.02,.28],[.96,.10]].map(cloudPoint)
    for(let i=0;i<edge.length;i++){
      const j=(i+1)%edge.length
      const region=a=>a<-.5?0:a>.7?2:1
      const left=region(cloudRim[i][0]),right=region(cloudRim[j][0])
      const light=i<12 ? 93+3*sin(i*1.7) : 79+3*cos(i)
      polygon([edge[i],edge[j],centers[right],centers[left]],color(i<12?49:197,48,light))
    }
    polygon(centers,color(190,45,88))
    ctx.save()
    ctx.beginPath()
    edge.forEach(([px,py],i)=>i ? ctx.lineTo(px,py) : ctx.moveTo(px,py))
    ctx.closePath()
    ctx.clip()
    const minX=Math.min(...edge.map(v=>v[0])), minY=Math.min(...edge.map(v=>v[1]))
    const width=Math.max(...edge.map(v=>v[0]))-minX, height=Math.max(...edge.map(v=>v[1]))-minY
    ctx.translate(minX,minY)
    ctx.globalAlpha=p.ascii
    ctx.fillStyle=ctx.createPattern(cloudGlyphs,'repeat')
    ctx.fillRect(0,0,width,height)
    ctx.restore()
  }
  for(const bank of cloudBanks) {
    const period=(W+bank[3]*380)*p.squeeze
    for(let copy=-2;copy<=2;copy++) drawCloud(bank,(skyPhase+copy)*period)
  }
  // La tierra sigue el mismo horizonte curvo que las raíces.
  const horizon=Array.from({length:45},(_,i)=>project([(i-22)*1.4,-.25,12+cos(i*.38)]))
  polygon([...horizon,[2200,H+400],[-1200,H+400]],color(83,43,32))
  function plant(item) {
    if(item.flower){flower(item.flower);return}
    const blade=item.blade
    const {x,z,lean}=blade
    const h=blade.h*(.48+.52*Math.min(1,z))
    const a=project([x-.009,-.18,z]), b=project([x+.009,-.18,z])
    const bend=project([x+lean*.32,h*.52-.12,z])
    const tip=project([x+lean+.025*sin(t+z),h-.1,z-.04])
    polygon([a,bend,tip,b],color(69+h*80,48+h*46,24+h*65))
  }
  for(const item of plants) if(item.z>3) plant(item)

  const faces=[]
  const tilt=p.canTilt*Math.PI/180, twist=p.canTurn*Math.PI/180
  function world([x,y,z]) {
    x*=p.canSize; y*=p.canSize; z*=p.canSize
    const a=x*cos(tilt)-y*sin(tilt), b=x*sin(tilt)+y*cos(tilt)
    return [.26+a*cos(twist)+z*sin(twist),2.53+b,2.72-a*sin(twist)+z*cos(twist)]
  }
  function face(verts,paint) {
    const v=verts.map(world)
    faces.push({points:v.map(project), depth:v.reduce((a,b)=>a+b[2]*cos(pitch)+b[1]*sin(pitch),0)/v.length, paint})
  }
  function ring(y,rx,rz) {
    return Array.from({length:p.facets},(_,i)=>[rx*cos(i*TAU/p.facets),y,rz*sin(i*TAU/p.facets)])
  }
  const metal=(i,band)=> {
    const glint=(1+cos(TAU*i/p.facets+1.35+twist))/2
    const h=glint>.86 ? 54 : glint<.27 ? 282 : 177
    return color(h,glint>.85?67:38,Math.min(97,16+glint*50+band+26*cos(i*TAU/p.facets*3+band*.08)))
  }
  function join(lower,upper,shade) {
    for(let i=0;i<lower.length;i++) {
      const j=(i+1)%lower.length
      face([lower[i],lower[j],upper[j],upper[i]],shade(i))
    }
  }
  const base=ring(-.64,.75,.46), rim=ring(.57,.62,.41), foot=ring(-.59,.78,.48)
  join(base,foot,i=>metal(i,18));join(foot,rim,i=>metal(i,3))
  face(base,color(193,32,22))
  const inner=ring(-.65,.64,.37);face(inner,color(177,29,33))
  join(rim,ring(.61,.65,.43),i=>metal(i,22))
  face(ring(.615,.60,.385),color(189,32,15))
  join(ring(-.32,.743,.472),ring(-.28,.741,.47),i=>metal(i,18))
  // Secciones perpendiculares al eje del tubo, también para la roseta.
  function tubeRing(x,y,r,angle) {
    return Array.from({length:p.facets},(_,i)=>{
      const a=i*TAU/p.facets
      return [x-r*sin(angle)*cos(a),y+r*cos(angle)*cos(a),r*sin(a)]
    })
  }
  const spoutAngle=2.73
  const socket=tubeRing(-.5,-.3,.29,spoutAngle), neck=tubeRing(-1.42,.30,.105,spoutAngle)
  join(socket,neck,i=>metal(i,8))
  const rose=tubeRing(-1.70,.27,.31,3.65)
  join(neck,rose,i=>metal(i,15));face(rose,color(50,53,66))
  for(let j=0;j<13;j++){
    const a=j*2.4,r=.067*Math.sqrt(j)
    const hole=tubeRing(-1.71-r*sin(3.65)*cos(a),.265+r*cos(3.65)*cos(a),.024,3.65)
    face(hole.map(([x,y,z])=>[x,y,z+r*sin(a)]),color(186,28,24))
  }
  let last
  for(let j=0;j<=14;j++) {
    const a=-1.35+j*2.97/14
    const section=tubeRing(.54+.65*cos(a),.19+.71*sin(a),.088,a+Math.PI/2)
    if(last)join(last,section,i=>metal(i,17))
    last=section
  }
  faces.sort((a,b)=>b.depth-a.depth)
  for(const f of faces)polygon(f.points,f.paint)
  const nozzle=world([-1.72,.25,0])
  for(let j=0;j<p.blocks+p.water;j++) {
    const isBlock=j<p.blocks
    const d=isBlock ? drops[j] : drizzle[j-p.blocks]
    const u=(phase*p.showers+(isBlock ? j/p.blocks : d.phase))%1
    const lane=isBlock ? (j*.618034+d.phase*.13)%1 : d.phase
    const groundZ=.68+2.8*(d.drift+.5)
    const groundX=nozzle[0]+p.spread*((lane-.5)*groundZ*1.35*p.squeeze-nozzle[0])
    const pos=project([nozzle[0]+(groundX-nozzle[0])*u,
      nozzle[1]-.18*u-(nozzle[1]+.04)*u*u,nozzle[2]+(groundZ-nozzle[2])*u])
    const fade=Math.min(1,u*13,(1-u)*6)
    ctx.save();ctx.globalAlpha=fade*(isBlock?.98:.77)
    ctx.translate(pos[0],pos[1])
    ctx.rotate(isBlock ? p.spin*(d.spread*.7+u*d.drift*TAU*1.4) : -.14+.25*d.spread)
    if(isBlock) {
      ctx.scale(p.blockSize,p.blockSize)
      const word=j%2 ? 'EMOTION' : 'MOTION'
      const size=23+7*u
      ctx.font='italic 900 '+size+'px Arial, sans-serif'
      const width=ctx.measureText(word).width+22
      ctx.beginPath()
      ctx.roundRect(-9,-size*.94,width,size*1.24,6)
      const blockHue=j%2 ? p.emotionHue : p.motionHue
      ctx.fillStyle=color(blockHue,94,65)
      ctx.fill()
      ctx.lineWidth=2
      ctx.strokeStyle=color(blockHue,72,26)
      ctx.stroke()
      ctx.fillStyle=color(246,38,12)
      ctx.fillText(word,2,0)
    } else {
      polygon([[0,0],[-2,-10-u*7],[2,-4],[3,1]],color(j%4?181:304,86,84))
    }
    ctx.restore()
  }
  for(const item of plants) if(item.z<=3) plant(item)
  // La textura cubre todo el sensor incluso con compresión anamórfica.
  ctx.translate(540,0)
  ctx.scale(p.squeeze,1)
  ctx.translate(-540,0)
  if(p.grain) {
    if(!posterTexture.has(ctx)) posterTexture.set(ctx,ctx.createPattern(noise,'repeat'))
    ctx.save(); ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=p.grain
    const shift=Math.floor(phase*48)%8*23
    ctx.translate(-shift,-shift);ctx.fillStyle=posterTexture.get(ctx);ctx.fillRect(0,0,W+shift,H+shift);ctx.restore()
  }
  ctx.restore()
}
