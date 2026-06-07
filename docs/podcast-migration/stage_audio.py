#!/usr/bin/env python3
"""Stage all PowerPress podcast episodes into DigitalOcean Spaces.

Streams each enclosure from its origin host straight to Spaces (no local disk),
organized per show: iAccessibility/podcast/<show-slug>/episodes/<id>-<file>.
Resumable: skips objects that already exist. Reads DO creds from ../../.env.local.
"""
import os, re, json, ssl, threading, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
import boto3
try:
    import certifi; SSLCTX = ssl.create_default_context(cafile=certifi.where())
except Exception:
    SSLCTX = ssl._create_unverified_context()

HERE = os.path.dirname(os.path.abspath(__file__))
ENV = os.path.join(HERE, '..', '..', '.env.local')
MANIFEST = os.path.join(HERE, 'manifest.json')
OUT = os.path.join(HERE, 'staged.json')

env = {}
for line in open(ENV):
    m = re.match(r'(DO_SPACES_[A-Z_]+)=(.*)', line.strip())
    if m: env[m.group(1)] = m.group(2)

BUCKET = env['DO_SPACES_BUCKET']
PREFIX = 'iAccessibility/podcast/'

def client():
    return boto3.session.Session().client(
        's3', region_name=env['DO_SPACES_REGION'], endpoint_url=env['DO_SPACES_ENDPOINT'],
        aws_access_key_id=env['DO_SPACES_KEY'], aws_secret_access_key=env['DO_SPACES_SECRET'])

def slugify(show):
    s = re.sub(r'[^a-z0-9]+', '', (show or '').lower())
    return s or 'uncategorized'

def filename(ep):
    path = urllib.parse.urlparse(ep['url']).path
    base = os.path.basename(path) or f"{ep['id']}.mp3"
    base = re.sub(r'[^A-Za-z0-9._-]', '_', base)
    if not re.search(r'\.(mp3|m4a|wav|ogg|aac)$', base, re.I):
        base += '.mp3'
    return f"{ep['id']}-{base}"

eps = json.load(open(MANIFEST))
_local = threading.local()
lock = threading.Lock()
state = {'done': 0, 'skip': 0, 'fail': 0, 'bytes': 0, 'n': len(eps)}

def get_client():
    if not hasattr(_local, 'c'): _local.c = client()
    return _local.c

def one(ep):
    c = get_client()
    slug = slugify(ep['show'])
    key = f"{PREFIX}{slug}/episodes/{filename(ep)}"
    rec = {'id': ep['id'], 'show': ep['show'], 'slug': slug, 'src': ep['url'],
           'key': key, 'spaces_url': f"{env['DO_SPACES_PUBLIC_URL']}/{urllib.parse.quote(key)}"}
    try:
        try:
            h = c.head_object(Bucket=BUCKET, Key=key)
            if ep['bytes'] in (0, h['ContentLength']):
                rec['status'] = 'exists'
                with lock:
                    state['skip'] += 1
                    log(rec)
                return rec
        except Exception:
            pass
        req = urllib.request.Request(ep['url'], headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15', 'Referer': 'https://iaccessibility.net/'})
        resp = urllib.request.urlopen(req, timeout=90, context=SSLCTX)
        extra = {'ACL': 'public-read', 'ContentType': ep.get('mime') or 'audio/mpeg'}
        c.upload_fileobj(resp, BUCKET, key, ExtraArgs=extra)
        size = c.head_object(Bucket=BUCKET, Key=key)['ContentLength']
        rec['status'] = 'uploaded'; rec['bytes'] = size
        with lock:
            state['done'] += 1; state['bytes'] += size
            log(rec)
        return rec
    except Exception as e:
        rec['status'] = 'FAIL'; rec['error'] = f"{type(e).__name__}: {e}"
        with lock:
            state['fail'] += 1
            log(rec)
        return rec

def log(rec):
    i = state['done'] + state['skip'] + state['fail']
    tag = rec['status']
    print(f"[{i}/{state['n']}] {tag:8} {rec['slug']}/{rec['id']}  "
          f"ok={state['done']} skip={state['skip']} fail={state['fail']} "
          f"{state['bytes']/1073741824:.2f}GB", flush=True)
    if rec['status'] == 'FAIL':
        print(f"    !! {rec['src']} -> {rec.get('error')}", flush=True)

results = []
with ThreadPoolExecutor(max_workers=5) as ex:
    futs = [ex.submit(one, ep) for ep in eps]
    for f in as_completed(futs):
        results.append(f.result())

json.dump(results, open(OUT, 'w'), indent=0)
print(f"\nDONE. uploaded={state['done']} skipped={state['skip']} failed={state['fail']} "
      f"total={state['bytes']/1073741824:.2f}GB. Wrote {OUT}", flush=True)
fails = [r for r in results if r['status'] == 'FAIL']
if fails:
    print(f"{len(fails)} failures (re-run to retry; existing uploads are skipped):", flush=True)
    for r in fails[:20]:
        print(f"  {r['id']} {r['src']} {r.get('error')}", flush=True)
