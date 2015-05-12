#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import urllib
import base64
import mimetypes
import os
import json
import codecs
from urlparse import urlparse
from zipfile import ZipFile
from datetime import datetime
import time
import shutil
import re
import logging

APPCACHE_LOCAL_DEFAULT_PATH = 'cache/'
APPCACHE_LOCAL_DEFAULT_NAME = 'manifest.appcache'

logger = logging.getLogger('GaiaPreloadApp')
logger.setLevel(logging.INFO)
sh = logging.StreamHandler()
logger.addHandler(sh)

def set_logger_level(lv):
    logger.setLevel(lv)

def has_scheme(url):
    return bool(url.scheme)


def retrieve_from_url(url, target):
    """
    save file from url
    """
    if (os.path.isdir(target)):
        target += 'index.html'
    return urllib.urlretrieve(url, target)


def open_from_url(url):
    """
    return file object from url
    """
    return urllib.urlopen(url)


def get_absolute_url(domain, path, icon):
    icon_path = None
    origin = urlparse(''.join([domain, path]))
    if has_scheme(icon):
        return icon.geturl()
    if icon.path[0] == '/':
        icon_path = icon.path
    else:
        icon_path = '%s/%s' % (os.path.dirname(origin.path), icon.path)

    if(path.startswith('http')):
        return icon_path
    else:
        return '%s://%s%s' % (origin.scheme, origin.netloc, icon_path)


def get_directory_name(appname):
    return re.sub(r'[\W\s]', '', appname).lower()


def split_url(manifest_url):
    path = None
    url = urlparse(manifest_url)
    domain = '%s://%s' % (url.scheme, url.netloc)
    if url.path.count('/') > 1:
        path = ''.join([os.path.dirname(url.path), '/'])
    else:
        path = '/'
    return (domain, path)


def convert_icon(image, mimetype):
    return 'data:%s;base64,%s' % (mimetype, base64.b64encode(image))


def fetch_icon_from_url(url):
    image = open_from_url(url).read()
    return convert_icon(image, mimetypes.guess_type(url)[0])


def fetch_icon(key, icons, domain, path, apppath):
    iconurl = get_absolute_url(domain, path,
                               urlparse(icons[key]))
    icon_base64 = ''
    if iconurl[0] == '/':
        logger.info('locally...')
        icon_base64 = iconurl
    # fetch icon from url
    elif (iconurl.startswith('http') and
          (iconurl.endswith(".png") or iconurl.endswith(".jpg"))):
        logger.info(' ' + key + ' from internet...',)
        subfix = "/icon.png" if iconurl.endswith(".png") else "/icon.jpg"
        retrieve_from_url(iconurl, apppath + subfix)
        with open(apppath + subfix) as fd:
            image = fd.read()
            icon_base64 = convert_icon(image,
                                       mimetypes.guess_type(iconurl)[0])
        os.remove(apppath + subfix)
    # fetch icon from local
    else:
        icon_base64 = fetch_icon_from_url(iconurl)
    return icon_base64

def get_resource_path_and_url(domain, workingdir, resource_path):
    if has_scheme(urlparse(resource_path)):
        resource_url = resource_path
    elif resource_path[0] == '/':
        resource_url = ''.join([domain, resource_path])
        resource_path = resource_path.lstrip('/')
    else:
        resource_url = ''.join([domain, workingdir, resource_path])
        resource_path = ''.join([workingdir, resource_path]).lstrip('/')
    return (resource_url, resource_path)

def fetch_resource(domain, workingdir, local_dir, resource_path):
    """
    fetch resource described in appcache manifest
    """
    try:
        url, path = get_resource_path_and_url(domain, workingdir, resource_path)
        # create directories if not exist
        local_resource_path = ''.join([local_dir, path])
        local_resource_dir = os.path.dirname(local_resource_path)
        if not os.path.exists(local_resource_dir):
            os.makedirs(local_resource_dir)

        (_filename, _headers) = retrieve_from_url(url, local_resource_path)
        # I need to save the header at some place so they can be written (and processed at install time)
        return (path.lstrip('/'), _headers)
    except IOError as e:
        logger.info('IO failed ', e)
    except urllib.URLError as e:
        logger.info('fetch failed ', e)


def get_appcache_manifest_dir(manifest_dir, appcache_path):
    logger.info('Manifest dir: ' + manifest_dir + '. appcache_path: ' + appcache_path)
    if (appcache_path[0] != '/'):
        result = os.path.join(manifest_dir, os.path.dirname(appcache_path))
    else:
        result = os.path.dirname(appcache_path)
    return result if result[-1] == '/' else result + '/'


def get_appcache_manifest(domain, manifest_dir, app_dir, appcache_path):
    manifest = {
        'remote_dir': get_appcache_manifest_dir(manifest_dir, appcache_path),
        'filename': os.path.basename(appcache_path),
        'local_dir': os.path.join(app_dir, APPCACHE_LOCAL_DEFAULT_PATH)
    }
    manifest['local_path'] = os.path.join(manifest[
                                          'local_dir'], APPCACHE_LOCAL_DEFAULT_NAME)
    origin = urlparse(domain)
    base_path = '%s://%s' % (origin.scheme, origin.netloc)
    manifest['url'] = ''.join([base_path,
                               manifest['remote_dir'],
                               manifest['filename']])
    return manifest


def format_resource_metadata(file, header):
    """
      documentation here
    """

    lastModified = header.getheader('last-modified', 'Epoch')
    lastFetched = header.getheader('date', 'Now')
    return '"' + file + '": { "lastModified": "' + lastModified + '", "lastFetched": "' + lastFetched + '"}'


def fetch_appcache(domain, remote_dir, local_dir, lines):
    """
    fetch appcache file described in manifest.webapp

    output:

    [appname]/cache/[name].appcache
    [appname]/cache/[resources] (if defined)
    """
    newlines = []
    headers = []
    try:
        # retrieve resources from appcache
        curr = None
        SECTIONS = ['CACHE MANIFEST', 'NETWORK:', 'CACHE:', 'FALLBACK:']
        for line in lines:
            line = line.strip()
            if line in SECTIONS:
                curr = line
                newlines.append(line)
                continue
            if len(line) == 0 or line[0] == '#':
                newlines.append(line)
                continue

            if curr == SECTIONS[0] or curr == SECTIONS[2]:
                logger.info(' get resource ' + line + '...')
                (line, header) = fetch_resource(domain, remote_dir, local_dir, line)
            elif curr == SECTIONS[3]:
                logger.info(' get resource ' + line + '...')
                (_line, header) = fetch_resource(domain, remote_dir, local_dir,
                               line.split(' ')[1])
            newlines.append(line)
            headers.append(format_resource_metadata(line, header))
    except Exception as e:
        logger.info(' fetch failed ', e)
    return (newlines, headers)


def fetch_webapp(app_url, directory=None):
    """
    get webapp file and parse for preinstalled webapp

    output:

    [appname]/manifest.webapp
    [appname]/metadata.json
    [appname]/update.webapp (if package_path is defined)
    [appname]/cache/ (if appcache_path is defined)
    """
    domain, path = split_url(app_url)
    url = urlparse(app_url)
    metadata = {'origin': domain}
    manifest_filename = 'manifest.webapp'

    if url.scheme:
        logger.info('manifest: ' + app_url)
        logger.info('fetching manifest...')
        manifest_url = open_from_url(app_url)
        manifest = json.loads(manifest_url.read().decode('utf-8-sig'))
        metadata['installOrigin'] = 'https://marketplace.firefox.com'
        if 'etag' in manifest_url.headers:
            metadata['etag'] = manifest_url.headers['etag']
    else:
        logger.info('extract manifest from zip...')
        appzip = ZipFile(app_url, 'r').read('manifest.webapp')
        manifest = json.loads(appzip.decode('utf-8-sig'))

    appname = get_directory_name(manifest['name'])
    app_dir = appname
    if directory is not None:
        app_dir = os.path.join(directory, appname)

    if not os.path.exists(app_dir):
        os.mkdir(app_dir)

    if 'package_path' in manifest or not url.scheme:
        manifest_filename = 'update.webapp'
        filename = 'application.zip'
        metadata.pop('origin', None)

        if url.scheme:
            logger.info('downloading app...')
            path = manifest['package_path']
            retrieve_from_url(
                manifest['package_path'],
                os.path.join(app_dir, filename))
            metadata['manifestURL'] = url.geturl()
            metadata['packageEtag'] = open_from_url(path).headers['etag']
        else:
            logger.info('copying app...')
            shutil.copyfile(app_url, '%s%s%s' % (appname, os.sep, filename))
            metadata['manifestURL'] = ''.join(
                [domain, path, 'manifest.webapp'])

        manifest['package_path'] = ''.join(['/', filename])

    logger.info('fetching icons...')
    for key in manifest['icons']:
        manifest['icons'][key] = fetch_icon(
            key, manifest['icons'], domain, path, app_dir)

    if 'appcache_path' in manifest:
        metadata_info = [];
        logger.info('fetching appcache...',)
        appcache_manifest = get_appcache_manifest(
            domain, path, app_dir, manifest['appcache_path'])
        if not os.path.exists(appcache_manifest['local_dir']):
            os.makedirs(appcache_manifest['local_dir'])

        logger.info(' from ' + appcache_manifest['url'])
        logger.info(' save to ' + appcache_manifest['local_path'],)
        ( _filename, headerAC ) = retrieve_from_url(appcache_manifest['url'],
                                                    appcache_manifest['local_path'])
        lines = []
        with open(appcache_manifest['local_path']) as fd:
            lines = fd.readlines()

        (lines, headers) = fetch_appcache(domain, appcache_manifest['remote_dir'],
                                          appcache_manifest['local_dir'], lines)
        with open(appcache_manifest['local_path'], 'w') as fd:
            logger.info('overwrite new appcache')
            lines.append('')
            fd.write('\n'.join(lines))
        with open(appcache_manifest['local_dir'] + '../resources_metadata.json', 'w') as resources:
            resources.write('{\n');
            headers.append(format_resource_metadata(appcache_manifest['local_path'], headerAC))
            resources.write(',\n'.join(headers))
            resources.write('\n}\n');

    # add manifestURL for update
    metadata['manifestURL'] = app_url
    metadata['external'] = True

    f = file(os.path.join(app_dir, 'metadata.json'), 'w')
    f.write(json.dumps(metadata))
    f.close()

    f = codecs.open(os.path.join(app_dir, manifest_filename), 'w', 'utf-8')
    f.write(json.dumps(manifest, ensure_ascii=False))
    return manifest


def main():
    print os.getcwd()

    # icon convertion script
    if (len(sys.argv) == 3 and sys.argv[1] == "--icon"):
        result = fetch_icon_from_url(sys.argv[2])
        logger.info(result.replace('/', '\/'))
    # fetch single webapp
    elif (len(sys.argv) > 1):
        fetch_webapp(sys.argv[1])
    else:
        # automatically read and compose customized webapp from list
        # support csv like list format with ',' separator, ex:
        #
        # Youtube,http://m.youtube.com/mozilla_youtube_webapp
        with open('list') as fd:
            while True:
                line = fd.readline()
                if (len(line.split(',')) > 1):
                    fetch_webapp(line.split(',')[1].rstrip('\n'))
                else:
                    break

if __name__ == '__main__':
    main()
