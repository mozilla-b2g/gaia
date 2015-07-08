"""
Gaia Marketplace helper. Takes packaged manifest as only argument.
Copy this into the Marketplace app folder (dev/stage/prod whatever), and run.
Fetches Marketplace package and Etags (e.g., m.f.c/packaged.webapp).
Downloads application.zip for you.
If metadata.json is in path, replaces the appropriate fields.

>> python gaia_package.py https://marketplace.firefox.com/packaged.webapp

And you're done!
"""
import json
import os
import requests
import sys


try:
    manifest_url = sys.argv[1]
    if not manifest_url.startswith('http'):
        raise
except:
    print "Please give a valid manifest (e.g., m.f.c/packaged.webapp)."
    sys.exit(0)

r = requests.get(manifest_url)
package_path = json.loads(r.content)['package_path']
etag = r.headers['etag'].replace('"', '')

print "Downloading package"
r = requests.get(package_path)
package = r.content
package_etag = r.headers['etag'].replace('"', '')

f = open('application.zip', 'w')
f.write(package)

print "Package path: %s" % package_path
print "Etag: %s" % etag
print "Package Etag: %s" % package_etag

filename = 'metadata.json'
try:
    f = open(filename, 'rw')
except:
    sys.exit(0)

print "Updating metadata.json"
tmp_filename = 'metadata.json.tmp'
tmp_f = open(tmp_filename, 'w')
for line in f:
    if '"etag"' in line:
        line = r'%s%s%s' % (line[0:13], etag, line[-5:])
        line = line.replace(r'\\', r'\\\\')
    elif '"packageEtag"' in line:
        line = r'%s%s%s' % (line[0:20], package_etag, line[-5:])
        line = line.replace(r'\\', r'\\\\')
    tmp_f.write(line)
tmp_f.close()
os.rename(tmp_filename, filename)
