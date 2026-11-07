"""Capture comparison evidence from the unchanged base commit in a detached worktree.
Usage: python capture_before.py /path/to/base-worktree
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,sys,os,time
root=Path(sys.argv[1]);out=Path(__file__).resolve().parent/'screenshots';url='http://127.0.0.1:43996'
server=subprocess.Popen(['node','server/index.js'],cwd=root/'node-server',env={**os.environ,'PORT':'43996','ALPHA_ENABLED':''},stdout=subprocess.DEVNULL)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium');page=b.new_page(viewport={'width':1440,'height':900})
  for _ in range(40):
   try:page.goto(url);break
   except:time.sleep(.1)
  page.evaluate("document.querySelector('[data-view=profile]').click()")
  page.locator('#modal [data-studio=open]').click();page.wait_for_selector('#modal .av-studio-preview svg')
  for w,h in [(1440,900),(390,844)]:
   page.set_viewport_size({'width':w,'height':h});page.screenshot(path=str(out/f'before-studio-{w}.png'))
  page.locator('#modal [data-close]').first.click();page.set_viewport_size({'width':1440,'height':900});page.locator('#hero-create').click();page.locator('#c-go').click();page.wait_for_function('App.S?.code')
  page.evaluate("""async()=>await new Promise(resolve=>{window.peer=io({forceNew:true});peer.on('connect',()=>peer.emit('joinRoom',{code:App.S.code,token:crypto.randomUUID().replaceAll('-',''),profile:{name:'Nova',avatar:{e:2,c:3}}},()=>resolve()));})""")
  page.evaluate("App.socket.emit('switchGame',{game:'drawguess'})");page.wait_for_function("App.S.gameId==='drawguess'");page.evaluate("App.socket.emit('startGame')");page.wait_for_selector('[data-choose]');page.locator('[data-choose]').first.click()
  for w,h in [(1366,768),(390,844)]:
   page.set_viewport_size({'width':w,'height':h});page.screenshot(path=str(out/f'before-drawing-{w}.png'))
  b.close()
finally:server.terminate();server.wait(timeout=10)
