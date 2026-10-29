"""Run historical UI browser suites against their retained entry point."""
import os,sys,runpy
from playwright.sync_api import Page
variant=os.environ.get('BACCARAT_VARIANT','vesper')
if variant not in ('classic','vesper'):raise SystemExit('BACCARAT_VARIANT must be classic or vesper')
original=Page.goto
def goto(self,url,*args,**kwargs):return original(self,url.replace('/baccarat/index.html',f'/baccarat/{variant}.html'),*args,**kwargs)
Page.goto=goto
for path in sys.argv[1:]:
 print('Retained',variant,path,flush=True);runpy.run_path(path,run_name='__main__')
