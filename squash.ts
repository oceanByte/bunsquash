const html = `<!doctype html><meta charset=utf8><title>bunsquash</title><link rel=icon href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🐰</text></svg>">
<style>
  html,body{height:100%}
  body{font:15px system-ui;margin:0;background:#111;color:#eee;overflow:hidden}
  main{height:100%;box-sizing:border-box;width:100%;padding:18px 24px;display:flex;flex-direction:column;gap:14px}
  .bar{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
  h1{margin:0;font-weight:800;letter-spacing:-.02em;white-space:nowrap}
  label{color:#9aa}
  select,button{background:#222;color:#eee;border:1px solid #333;border-radius:8px;padding:7px 12px}
  button{cursor:pointer;background:#3b82f6;border-color:#3b82f6;font-weight:600}
  button:disabled{background:#222;border-color:#333;color:#666;cursor:default}
  input[type=range]{width:150px;accent-color:#3b82f6}
  .stat{color:#9aa;font-variant-numeric:tabular-nums}
  .save{color:#34d399;font-weight:700}
  .frame{position:relative;flex:1;min-height:0;border-radius:10px;overflow:hidden;background:#181818;border:2px dashed #333;cursor:ew-resize}
  .frame img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none}
  #comp{clip-path:inset(0 0 0 50%)}
  #handle{position:absolute;top:0;bottom:0;left:50%;width:2px;margin-left:-1px;background:#fff;box-shadow:0 0 4px #0009;pointer-events:none;display:none}
  #handle::after{content:'';position:absolute;top:50%;left:1px;width:30px;height:30px;margin:-15px;border-radius:50%;background:#fff;box-shadow:0 1px 6px #0009}
  .tag{position:absolute;bottom:10px;padding:4px 9px;border-radius:6px;background:#000a;font-size:13px;pointer-events:none}
  #hint{position:absolute;inset:0;display:grid;place-items:center;color:#9aa;pointer-events:none}
</style>
<main>
  <div class=bar>
    <h1>🐰 bunsquash</h1>
    <label>Format</label><select id=fmt><option>webp<option>jpeg<option>png</select>
    <label>Quality</label><input id=q type=range min=1 max=100 value=80><span id=qv class=stat>80</span>
    <button id=dl disabled>Download</button>
    <input id=file type=file accept=image/* hidden>
  </div>
  <div class=frame id=frame>
    <img id=orig><img id=comp>
    <div id=handle></div>
    <span class=tag style=left:10px>Original <span id=so class=stat></span></span>
    <span class=tag style=right:10px>Compressed <span id=sc class=stat></span></span>
    <div id=hint>Drop an image or click to choose</div>
  </div>
</main>
<script>
  let bytes, name, out, drag = false
  const $ = id => document.getElementById(id)
  const setp = x => {
    const r = $('frame').getBoundingClientRect()
    const p = Math.max(0, Math.min(100, (x - r.left) / r.width * 100))
    $('comp').style.clipPath = 'inset(0 0 0 ' + p + '%)'; $('handle').style.left = p + '%'
  }
  $('frame').onpointerdown = e => { e.preventDefault(); bytes ? (drag = true, setp(e.clientX)) : $('file').click() }
  addEventListener('pointermove', e => drag && setp(e.clientX))
  addEventListener('pointerup', () => drag = false)
  $('dl').onclick = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(out)
    a.download = name.replace(/\.[^.]+$/, '') + '.' + $('fmt').value
    a.click()
  }
  $('q').oninput = e => $('qv').textContent = e.target.value
  $('q').onchange = compress
  $('fmt').onchange = () => {
    const png = $('fmt').value === 'png'
    $('q').disabled = png; $('q').style.opacity = $('qv').style.opacity = png ? .4 : 1
    compress()
  }
  $('file').onchange = e => load(e.target.files[0])
  document.ondragover = e => e.preventDefault()
  document.ondrop = e => { e.preventDefault(); load(e.dataTransfer.files[0]) }
  async function load(f) {
    if (!f) return
    name = f.name; bytes = new Uint8Array(await f.arrayBuffer())
    $('orig').src = URL.createObjectURL(f); $('hint')?.remove(); $('frame').style.border = 'none'; $('handle').style.display = 'block'
    $('so').textContent = '· ' + (bytes.length/1024).toFixed(1) + ' KB'
    compress()
  }
  async function compress() {
    if (!bytes) return
    $('sc').textContent = '· squashing…'
    const r = await fetch('/compress?format=' + $('fmt').value + '&quality=' + $('q').value, { method:'POST', body:bytes })
    out = await r.blob(); const orig = bytes.length, now = out.size
    $('comp').src = URL.createObjectURL(out); $('dl').disabled = false
    $('sc').innerHTML = '· ' + (now/1024).toFixed(1) + ' KB <span class=save>(-' + (100 - now/orig*100).toFixed(0) + '%)</span>'
  }
</script>`

Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname === '/') return new Response(html, { headers: { 'content-type': 'text/html' } })
    if (url.pathname === '/compress') {
      const fmt = url.searchParams.get('format') ?? 'webp'
      const quality = Number(url.searchParams.get('quality') ?? 80)
      const img = new Bun.Image(await req.arrayBuffer())
      const out = img[fmt](fmt === 'png' ? { compression: 9 } : { quality })
      return new Response(out)
    }
    return new Response('not found', { status: 404 })
  },
})

console.log('bunsquash → http://localhost:3000')
