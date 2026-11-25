// Coordenadas de jardín: Y vertical, Z alejándose de la lente.
const TAU = Math.PI * 2
const { sin, cos, hypot } = Math
export const defaults = { lens: .58, altitude: .18, angle: -8, zoom: 1, grain: .23,
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
const grass = Array.from({length: 1100}, () => {
  const z=.10+random()**1.6*9
  return {x:(random()-.5)*(z*2.8+.8),z,h:.07+random()*.33,lean:(random()-.5)*.38}
}).sort((a,b)=>b.z-a.z)
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

export function render(ctx, phase, p, phrases) {
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
  const roll = p.angle*Math.PI/180 + .018*sin(t)
  const pitch = .38 + .035*cos(t)
  const dx = .09*sin(t)
  function project([x,y,z]) {
    x -= dx
    y -= p.altitude
    const depth = z*cos(pitch)+y*sin(pitch)
    const up = y*cos(pitch)-z*sin(pitch)
    const r = hypot(x,up)
    const perspective = 1/Math.max(.24,depth)
    const fish = Math.atan2(r,depth)/Math.max(r,.0001)
    const scale = 880*p.zoom*((1-p.lens)*perspective+p.lens*fish)
    return [540+(x*cos(roll)+up*sin(roll))*scale,660+(x*sin(roll)-up*cos(roll))*scale,scale]
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
    if (head[0]<-s*3 || head[0]>W+s*3) return
    const mid=[(base[0]+head[0])*.5+s*.55,(base[1]+head[1])*.5]
    ctx.strokeStyle=color(83+9*sin(seed),52,24+6*cos(seed))
    ctx.lineWidth=Math.max(1,s*.12)
    ctx.beginPath(); ctx.moveTo(base[0],base[1]); ctx.quadraticCurveTo(...mid,head[0],head[1]); ctx.stroke()
    for(let k=0;k<3;k++) {
      const u=.28+k*.19, side=k%2 ? -1 : 1
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
  // La tierra sigue el mismo horizonte curvo que las raíces.
  const horizon=Array.from({length:45},(_,i)=>project([(i-22)*1.4,-.25,12+cos(i*.38)]))
  polygon([...horizon,[2200,H+400],[-1200,H+400]],color(83,43,32))
  for(const blade of grass) {
    const {x,z,h,lean}=blade
    const a=project([x-.014,-.18,z]), b=project([x+.014,-.18,z])
    const bend=project([x+lean*.32,h*.52-.12,z])
    const tip=project([x+lean+.025*sin(t+z),h-.1,z-.04])
    polygon([a,bend,tip,b],color(69+h*80,48+h*46,24+h*65))
  }
  const near=[]
  for(const f of flowers) { if(f.z>3) flower(f); else near.push(f) }

  const faces=[]
  const tilt=.24+.08*sin(t), twist=-.29+.14*cos(t)
  function world([x,y,z]) {
    const a=x*cos(tilt)-y*sin(tilt), b=x*sin(tilt)+y*cos(tilt)
    return [.26+a*cos(twist)+z*sin(twist),2.53+b+.065*cos(t),2.72-a*sin(twist)+z*cos(twist)]
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
  for(let j=0;j<drops.length;j++) {
    const d=drops[j],u=(phase*p.showers+d.phase)%1
    const pos=project([nozzle[0]-.46*u+d.spread*u*.96,nozzle[1]-.26*u-2.48*u*u,nozzle[2]+u*.6+d.drift*u*.8])
    const fade=Math.min(1,u*13,(1-u)*6)
    ctx.save();ctx.globalAlpha=fade*(j<8?.95:.77)
    ctx.translate(pos[0],pos[1]);ctx.rotate(-.14+.25*d.spread)
    if(j<8 && phrases.length) {
      ctx.font='italic 900 '+Math.round(16+9*u)+'px Arial, sans-serif'
      ctx.lineWidth=3;ctx.strokeStyle=color(190,48,22)
      const line=phrases[j%phrases.length]
      ctx.strokeText(line,0,0,210);ctx.fillStyle=color(53,90,88);ctx.fillText(line,0,0,210)
    } else {
      polygon([[0,0],[-2,-10-u*7],[2,-4],[3,1]],color(j%4?181:304,86,84))
    }
    ctx.restore()
  }
  for(const f of near) flower(f)
  // Wordmark de póster, con dos planchas de color desplazadas.
  ctx.font='italic 900 140px Arial Black, Arial, sans-serif'
  ctx.textAlign='left';ctx.lineJoin='round'
  for(const [word,y] of [['NOTION',1286],['EMOTION',1394]]) {
    ctx.save()
    ctx.translate(44,y)
    ctx.scale((word==='NOTION'?760:987)/ctx.measureText(word).width,1)
    ctx.lineWidth=10;ctx.strokeStyle=color(294,57,42);ctx.strokeText(word,2,3)
    ctx.lineWidth=5;ctx.strokeStyle=color(69,56,87);ctx.strokeText(word,0,0)
    ctx.fillStyle=color(179,23,19);ctx.fillText(word,0,0)
    ctx.restore()
  }
  if(p.grain) {
    if(!posterTexture.has(ctx)) posterTexture.set(ctx,ctx.createPattern(noise,'repeat'))
    ctx.save(); ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=p.grain
    const shift=Math.floor(phase*48)%8*23
    ctx.translate(-shift,-shift);ctx.fillStyle=posterTexture.get(ctx);ctx.fillRect(0,0,W+shift,H+shift);ctx.restore()
  }
  ctx.restore()
}
