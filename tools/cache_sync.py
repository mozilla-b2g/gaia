# Synchronizes the offline cache of an external app into a local directory
# structure. Run from the base directory of an app in gaia/external-apps.
# Builds a directory for each known origin in the offline cache.

import json
import os
import requests


def read_manifest():
    file = open('manifest.webapp', 'r').read()
    content = json.loads(file)
    return content


def read_origin():
    # Extract the origin from the origin file
    return open('origin', 'r').readline().rstrip()


def parse_offline_manifest(s, origin):
    lines = s.split('\n')

    # Bail if this is an invalid appcache manifest.
    if lines[0] != 'CACHE MANIFEST':
        return None

    sections = ['CACHE:', 'NETWORK:', 'FALLBACK:']

    current_section = 'CACHE'

    cache = []

    for line in lines[1:]:
        # ignore comments, empty lines, and wildcards
        if line.startswith('#') or line.startswith('*') or not line.rstrip():
            continue
        if line in sections:
            current_section = line[:len(line)-1]
            continue

        # Don't cache NETWORK entries.
        if current_section == 'NETWORK':
            continue

        # if we're in FALLBACK, extract the fallback path.
        if current_section == 'FALLBACK':
            line = line.split(' ')[1]

        # Ensure that all paths start with an origin.
        if not line.startswith('http'):
            if line.startswith('/'):
                line = line[1:]
            line = origin + line

        cache.append(line)

    return cache


def fetch_with_path(url):
    # are we dealing with something URL-esque?
    if not url.find('//') + 1:
        return None

    print 'fetching %s' % url
    file = requests.get(url, verify=False)
    if file.status_code != 200:
        return None

    # base our paths in the 'cache' directory.
    path = 'cache/' + url.split('//')[1]

    directory, fn = path.rsplit('/', 1)
    # make the directory structure
    if not os.path.exists(directory):
        os.makedirs(directory)

    # write our file
    out_file = open(path, 'w')
    out_file.write(file.content)

    return file.content;


def main():

    # Learn about the external app.
    app_manifest = read_manifest()
    origin = read_origin()

    if 'appcache_path' not in app_manifest:
        print 'no appcache found'
        return

    # Construct the appcache url and drop the first slash from appcache_path.
    appcache_url = origin + app_manifest.get('appcache_path')[1:]
    print 'fetching appcache at %s' % appcache_url

    cache_manifest = fetch_with_path(appcache_url)
    if not cache_manifest:
        print 'failed to fetch appcache'
        return

    cache = parse_offline_manifest(cache_manifest, origin)

    if not cache:
        print 'bad offline cache'
        return

    # fetch each file, and store it in the right place
    for entry in cache:
        fetch_with_path(entry);


main()
