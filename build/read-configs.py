"""Usage: python %prog [CONFIG_FILE]

Used by |make install-gaia| to collect apps, and move to the appropriate build directory.  You should not run this file directory. 

"""

import sys
import os
import json
import tempfile
import urllib2
from urlparse import urlparse
from pprint import pprint


def create_tmp(jsonobj, url):
  urlobj = urlparse(url)
  dirname = tempfile.mkdtemp()
  temp = open(dirname + "/manifest.webapp", 'w+b')
  temp2 = open(dirname + "/metadata.json", 'w+b')
  metadata ={ 'origin' : urlobj.scheme + "://" + urlobj.hostname,
              'type'   : 'web'}
  try:
    json.dump(jsonobj, temp)
    json.dump(metadata, temp2)
  finally: 
    temp.close()
    temp2.close()
  return dirname

def normalized(app):
  if app.startswith("http"): 
    try: 
      response = urllib2.urlopen(app)
      manifest_json = json.loads(response.read())
      return create_tmp(manifest_json, app)
    except IOError: 
      print "Unable to gather manifest data"
  else:
    return app;

def read_config(config_file):
  json_data = open(config_file)
  data = json.load(json_data)
  json_data.close()
  return data

def parse_apps(data):
  for app  in data['apps']:
    if app.startswith("http"):
      app_type = 'external-url'
      app = normalized(str(app))
    elif os.path.isfile(app + "/metadata.json"): 
      app_type = "external"
    else:
      app_type = "internal"
    print app_type + ":" + app


if __name__ == '__main__':
  if len(sys.argv) >= 0:
      config_file = sys.argv[1]
  data = read_config(config_file)
  parse_apps(data)

