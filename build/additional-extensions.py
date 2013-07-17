#!/usr/bin/python
#
# This script retrieves and installs additional extensions

import urllib2
import json
import zipfile
import cStringIO
import sys
import os
import optparse
from xml.dom.minidom import parse

AMO_URL = "https://services.addons.mozilla.org/en-US/firefox/api/1.5/addon/"

def get_extension_id(install_rdf):
    for elem in install_rdf.getElementsByTagName('em:id'):
        if elem.parentNode and elem.parentNode.tagName == 'Description':
            return elem.firstChild.nodeValue
    raise Exception("No extension ID found")

def get_unpack(install_rdf):
    elems = install_rdf.getElementsByTagName('em:unpack')
    if elems:
        return json.loads(elems[-1].firstChild.nodeValue)
    return False

def get_url_from_amo(amo_id):
    # XXX: Retrieve addon for current OS
    amo_info = parse(urllib2.urlopen(AMO_URL + amo_id))
    elems = amo_info.getElementsByTagName('install')
    if elems:
        return elems[0].firstChild.nodeValue
    raise Exception("No Download URL found for AMO ID: %s" % amo_id)

def install_from_url(url, profile_dir):
    buf = cStringIO.StringIO(urllib2.urlopen(url).read())
    xpi = zipfile.ZipFile(buf)
    install_rdf = parse(xpi.open('install.rdf'))
    extension_id = get_extension_id(install_rdf)
    if get_unpack(install_rdf):
        extension_dir = os.path.join(profile_dir, 'extensions', extension_id)
        if not os.path.exists(extension_dir):
            os.mkdir(extension_dir)
            xpi.extractall(extension_dir)
    else:
        xpi.close()
        buf.seek(0)
        xpi_name = os.path.join(profile_dir, 'extensions', extension_id + os.path.extsep + 'xpi')
        if not os.path.exists(xpi_name):
            xpi_out = open(xpi_name, 'wb')
            xpi_out.write(buf.read())
            xpi_out.close()

def main(gaia_dir, custom_profile_dir=None):
    profile_dir = custom_profile_dir or os.path.join(gaia_dir, "profile")
    build_dir = os.path.join(gaia_dir, 'build')
    extensions = json.load(
        open(os.path.join(build_dir, 'additional-extensions.json')))

    try:
        custom_extensions = json.load(
            open(os.path.join(build_dir, 'custom-extensions.json')))
    except:
        pass
    else:
        extensions.update(custom_extensions)

    try:
        installed_extensions = json.load(
            open(os.path.join(profile_dir, 'installed-extensions.json')))
    except:
        installed_extensions = []

    for name, extension in extensions.iteritems():
        sys.stdout.write('Installing %s...' % name)
        sys.stdout.flush()
        try:
            url = extension.get('url', '') or get_url_from_amo(extension['amo'])
        except Exception, e:
            sys.stdout.write(' failed (%s)\n' % e)
            continue
        if url in installed_extensions:
            sys.stdout.write(' already installed\n')
            continue
        try:
            install_from_url(url, profile_dir)
        except Exception, e:
            sys.stdout.write(' failed (%s)\n' % e)
            continue
        sys.stdout.write(' installed\n')
        installed_extensions.append(url)

    f = open(os.path.join(profile_dir, 'installed-extensions.json'), 'w')
    json.dump(installed_extensions, f)
    f.close()

if __name__ == "__main__":
    parser = optparse.OptionParser(description="Install additional extensions")
    parser.add_option("--gaia-dir", help="Gaia source directory", default="")
    parser.add_option("--profile-dir", help="profile directory")
    (options, args) = parser.parse_args(sys.argv[1:])

    main(options.gaia_dir, options.profile_dir)
