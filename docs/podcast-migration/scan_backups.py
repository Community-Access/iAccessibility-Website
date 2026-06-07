#!/usr/bin/env python3
"""Stream each cPanel account backup (.tar.gz) from the DO Space and list any audio
files inside (podcast episode recovery), without downloading to disk. Reads DO creds
from ../../.env.local. Writes findings to backup_audio_found.json + logs to stdout."""
import os, re, json, tarfile
import boto3
from botocore.config import Config

HERE = os.path.dirname(os.path.abspath(__file__))
env = {}
for line in open(os.path.join(HERE, '..', '..', '.env.local')):
    m = re.match(r'(DO_SPACES_[A-Z_]+)=(.*)', line.strip())
    if m: env[m.group(1)] = m.group(2)

c = boto3.session.Session().client(
    's3', region_name=env['DO_SPACES_REGION'], endpoint_url=env['DO_SPACES_ENDPOINT'],
    aws_access_key_id=env['DO_SPACES_KEY'], aws_secret_access_key=env['DO_SPACES_SECRET'],
    config=Config(read_timeout=900, retries={'max_attempts': 3}))
BUCKET = env['DO_SPACES_BUCKET']

AUDIO = re.compile(r'\.(mp3|m4a|wav|aac|ogg|flac)$', re.I)
HINT = re.compile(r'(iacast|ia.?cast|podcast|gamecast|unboxcast|powerpress|/iacast/)', re.I)

# latest-date account backups, smallest first for quick signal; iceb (16GB) last
DATE = '2026-06-06'
keys = []
for page in c.get_paginator('list_objects_v2').paginate(Bucket=BUCKET, Prefix=f'backups/{DATE}/accounts/'):
    for o in page.get('Contents', []):
        if o['Key'].endswith('.tar.gz'): keys.append((o['Size'], o['Key']))
keys.sort()  # small first

results = {}
for size, key in keys:
    acct = key.split('/')[-1].replace('.tar.gz', '')
    print(f"\n=== scanning {acct} ({size/1073741824:.2f} GB) :: {key} ===", flush=True)
    found = []
    try:
        body = c.get_object(Bucket=BUCKET, Key=key)['Body']
        with tarfile.open(fileobj=body, mode='r|gz') as tf:
            for m in tf:
                if not m.isfile():
                    continue
                if AUDIO.search(m.name) or (HINT.search(m.name) and m.size > 100000):
                    found.append({'path': m.name, 'bytes': m.size})
                    if AUDIO.search(m.name):
                        print(f"  AUDIO {m.size/1048576:8.1f}MB  {m.name}", flush=True)
    except Exception as e:
        print(f"  !! error scanning {acct}: {type(e).__name__}: {e}", flush=True)
    tb = sum(f['bytes'] for f in found if AUDIO.search(f['path']))
    na = sum(1 for f in found if AUDIO.search(f['path']))
    print(f"  -> {acct}: {na} audio files, {tb/1073741824:.2f} GB", flush=True)
    results[acct] = {'key': key, 'audio_count': na, 'audio_gb': round(tb/1073741824, 2), 'found': found}
    json.dump(results, open(os.path.join(HERE, 'backup_audio_found.json'), 'w'), indent=1)

print("\n===== SUMMARY =====", flush=True)
for acct, r in sorted(results.items(), key=lambda kv: -kv[1]['audio_gb']):
    print(f"  {acct:18} {r['audio_count']:5} audio  {r['audio_gb']:7.2f} GB", flush=True)
print("Done. Details in backup_audio_found.json", flush=True)
