"""Prove a new worker bypasses an old fresh HTTP cache without reloading play."""
import json,subprocess,threading
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];old_worker=subprocess.check_output(['git','show','cec3850:public/sw.js'],cwd=root).decode();new_worker=(root/'public/sw.js').read_text();state={'new':False,'requests':[]}
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(root/'public'),**kwargs)
 def log_message(self,*args):pass
 def do_GET(self):
  path=self.path.split('?')[0]
  if path in ['/','/sw.js','/qa-version.js']:
   content=('<!doctype html><title>Cache QA</title>' if path=='/' else (new_worker if state['new'] else old_worker) if path=='/sw.js' else ('version-2' if state['new'] else 'version-1')).encode();state['requests'].append(path);self.send_response(200);self.send_header('Content-Type','text/html' if path=='/' else 'text/javascript');self.send_header('Cache-Control','public, max-age=3600' if path=='/qa-version.js' else 'no-cache');self.end_headers();self.wfile.write(content)
  else:super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context();page=context.new_page();page.goto(f'http://127.0.0.1:{server.server_port}/');page.evaluate("async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready}");page.reload();first=page.evaluate("async()=>{window.playSentinel='still-playing';return await(await fetch('/qa-version.js')).text()}");assert first=='version-1';state['new']=True
  page.evaluate("""async()=>{const changed=new Promise((resolve,reject)=>{navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true});setTimeout(()=>reject(new Error('worker activation timeout')),30000)});const registration=await navigator.serviceWorker.getRegistration();await registration.update();await changed;}""")
  second=page.evaluate("async()=>await(await fetch('/qa-version.js')).text()");assert second=='version-2';assert page.evaluate('window.playSentinel')=='still-playing';context.set_offline(True);offline=page.evaluate("async()=>await(await fetch('/qa-version.js')).text()");assert offline=='version-2', {'offline':offline,'cache':page.evaluate("async()=>await Promise.all((await caches.keys()).map(async k=>[k,await (await (await caches.open(k)).match('/qa-version.js'))?.text()]))")};browser.close()
 result={'old':first,'afterUpdate':second,'offline':offline,'playPageNotReloaded':True};(root/'docs/qa/jackpot-camera/cache-report.json').write_text(json.dumps(result,indent=2));print(result)
finally:server.shutdown();server.server_close()
