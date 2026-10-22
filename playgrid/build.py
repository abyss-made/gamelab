import sys,json
src=open(sys.argv[2] if len(sys.argv)>2 else 'partypad-src.html').read()
words=open('words.min.json').read().strip()
base=sys.argv[1] if len(sys.argv)>1 else ''
out=src.replace('%%WORDS%%',words).replace('%%SHARE_BASE%%',base)
open(sys.argv[3] if len(sys.argv)>3 else 'partypad.html','w').write(out)
mock=open('mock.js').read()
open('site/index.html','w').write('<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><script>'+mock+'</script></head><body>'+out+'</body></html>')
print(len(out))
