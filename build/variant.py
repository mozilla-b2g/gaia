import optparse
import urllib2
import json
import os
import urlparse
import filecmp
import shutil

OUTPUT_FOLDER = 'temp'

APPS_FOLDER = 'apps'
APPS_DATA_FOLDER = 'data'
APPS_CONF_FOLDER = 'conf'
APPS_CONF_FILENAME = 'singlevariantconf.json'

PROFILE_APPS_FOLDER = 'svoperapps'

def getOrigin(url):
    origin = urlparse.urlsplit(url)
    origin = urlparse.urlunparse((origin.scheme, origin.netloc, '', '', '', ''))
    return origin

def deleteFolder(path):
    if not os.path.exists(path):
        return

    for root, dirs, files in os.walk(path, topdown=False):
        for name in files:
            os.unlink(os.path.join(root, name))
        for name in dirs:
            os.rmdir(os.path.join(root, name))

def check_cached_app(path):
    files = os.walk(path).next()[2]
    if not 'metadata.json' in files:
        return False

    if 'update.webapp' in files and 'application.zip' in files:
        return True

    if 'manifest.webapp' in files:
        return True

    return False

def copy_app(app_path, profile_path, app_id):
    dst = os.path.join(profile_path, PROFILE_APPS_FOLDER, app_id)
    if not os.path.exists(dst):
        os.makedirs(dst)
    for filename in os.walk(app_path).next()[2]:
        shutil.copy(os.path.join(app_path, filename), os.path.join(dst, filename))

def download_app(manifest_url, manifest, app_path, app_id, origin, installOrigin):
    """ Determine if application is hosted or packaged and save manifest """
    filename = 'manifest.webapp'
    manifestJSON = json.loads(manifest)
    is_packaged_app = False
    if 'package_path' in manifestJSON:
        is_packaged_app = True

    if is_packaged_app:
        """ packaged app """
        filename = 'update.webapp'
        package_path = manifestJSON['package_path']
        origin = getOrigin(package_path)

        """ download application """
        print 'Download application ', package_path
        response = urllib2.urlopen(package_path)
        app = response.read()

    if not origin:
        raise Exception("installOrigin required for app '" + app_id + "' in local_apps.json configuration file")

    """ Generate metadata.json """
    metadata = {
        'id': app_id,
        'installOrigin': installOrigin,
        'manifestURL': manifest_url,
        'origin': origin
    }
    metadata = json.dumps(metadata)

    """ Save to filesystem """
    with open(os.path.join(app_path, filename), 'wb') as temp_file:
        temp_file.write(manifest)

    with open(os.path.join(app_path, 'metadata.json'), 'wb') as temp_file:
        temp_file.write(metadata)

    if is_packaged_app:
        with open(os.path.join(app_path, 'application.zip'), 'wb') as temp_file:
            temp_file.write(app)

def fetch_manifest(app_id, manifest_url, origin, installOrigin, profile_path, app_path, is_app_cached):
    print 'Application ', app_id

    """ Download manifest """
    print 'Download manifest ', manifest_url
    isRemoteManifestAvailable = True
    try:
        manifest = (urllib2.urlopen(manifest_url)).read()
    except:
        isRemoteManifestAvailable = False

    """ If there is an error getting remote manifest and the app is not cached throw error """
    if not isRemoteManifestAvailable:
        if not is_app_cached:
            raise Exception('Network error')

        """ App is cached, use cached one """
        copy_app(app_path, profile_path, app_id)
        return

    """ Remote manifest available """
    if not os.path.exists(app_path):
        os.makedirs(app_path)

    with open(os.path.join(app_path, 'manifest.tmp'), 'wb') as temp_file:
        temp_file.write(manifest)

    if is_app_cached:
        """ Compare manifests  """
        manifestName = 'manifest.webapp'
        if os.path.exists(os.path.join(app_path, 'update.webapp')):
            manifestName = 'update.webapp'
        if filecmp.cmp(os.path.join(app_path, manifestName), os.path.join(app_path, 'manifest.tmp')):
            """ Cached manifest and rmeote are equal """
            os.remove(os.path.join(app_path, 'manifest.tmp'))
            copy_app(app_path, profile_path, app_id)
            return

        """ remote manifest has changed, app needs to be updated """
        os.rename(os.path.join(app_path, 'manifest.tmp'), os.path.join(app_path, manifestName))

    download_app(manifest_url, manifest, app_path, app_id, origin, installOrigin)
    copy_app(app_path, profile_path, app_id)

def fetch_apps(data, profile_path, distribution_path):
    apps = data['apps']

    distribution_path = os.path.join(distribution_path, OUTPUT_FOLDER, APPS_FOLDER, APPS_DATA_FOLDER)

    cached_apps = os.walk(distribution_path).next()[1]

    for app in apps:
        app_path = os.path.join(distribution_path, app)
        is_app_cached = False
        if app in cached_apps:
            cached_apps.remove(app)
            is_app_cached = True
            if not check_cached_app(app_path):
                deleteFolder(app_path)
                is_app_cached = False

        origin = None
        if 'origin' in apps[app]:
            origin = apps[app]['origin']

        installOrigin = None
        if 'installOrigin' in apps[app]:
            installOrigin = apps[app]['installOrigin']

        fetch_manifest(app, apps[app]['manifestURL'], origin, installOrigin, profile_path, app_path, is_app_cached)

    for app in cached_apps:
        deleteFolder(os.path.join(distribution_path, app))
        os.rmdir(os.path.join(distribution_path, app))

def fetch_conf(data, profile_path, distribution_path):
    print 'Generating metadata'

    """ Get apps to check faster if operator's apps are valid and get access to manifests """
    apps = data['apps']

    """ Iterate through operators  """
    output = {}
    output_homescreen = {}
    for operator in data['operators']:
        """ Build an array with the apps for one operator and check if id is valid"""
        row = []
        row_homescreen = []
        if operator.has_key('apps'):
            for app in operator['apps']:
                app_id = app['id']
                if not apps.has_key(app_id):
                    raise Exception("Invalid application id \'" + app_id + "\'")

                row.append(app_id)

                if not apps[app_id].has_key('manifestURL'):
                    raise Exception("manifestURL not found for application \'" + app_id + "\'")

                app['manifestURL'] = apps[app_id]['manifestURL']
                if app.has_key('id'):
                    del app['id']
                row_homescreen.append(app)

            """ For each mcc-mnc create an object with its apps array and add it to output """
            for mcc in operator['mcc-mnc']:
                output[mcc] = row
                output_homescreen[mcc] = row_homescreen

    with open(os.path.join(profile_path, PROFILE_APPS_FOLDER, APPS_CONF_FILENAME), 'w') as temp_file:
        temp_file.write(json.dumps(output))

    with open(os.path.join(distribution_path, OUTPUT_FOLDER, APPS_FOLDER, APPS_CONF_FOLDER, APPS_CONF_FILENAME), 'w') as temp_file:
        temp_file.write(json.dumps(output_homescreen))

def main():
    """ Arguments & options management """
    parser = optparse.OptionParser(description="Prepare local applications")
    parser.add_option('-l', '--local-apps-path', help="Path to the JSON defining the local apps")
    parser.add_option('-p', '--profile-path', help="Path to the profile folder")
    parser.add_option('-d', '--distribution-path', help="Path to the gaia distribution folder")
    (options, args) = parser.parse_args()

    if not options.local_apps_path:
        parser.error('local-aps-path not given')

    if not options.profile_path:
        parser.error('profile-path not given')

    if not options.distribution_path:
        parser.error('distribution-path not given')

    """ Create and clear temporal output folders """
    output_folder = os.path.join(options.distribution_path, OUTPUT_FOLDER)
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    if not os.path.exists(os.path.join(output_folder, APPS_FOLDER, APPS_DATA_FOLDER)):
        os.makedirs(os.path.join(output_folder, APPS_FOLDER, APPS_DATA_FOLDER))

    if not os.path.exists(os.path.join(output_folder, APPS_FOLDER, APPS_CONF_FOLDER)):
        os.makedirs(os.path.join(output_folder, APPS_FOLDER, APPS_CONF_FOLDER))
    deleteFolder(os.path.join(output_folder, APPS_FOLDER, APPS_CONF_FOLDER))

    """ Clear profile folder """
    deleteFolder(os.path.join(options.profile_path, PROFILE_APPS_FOLDER))

    """ Open JSON containning the apps and get saved apps to process and fetch each application """
    with open(options.local_apps_path, 'r') as json_file:
        data = json.load(json_file)

    """ Prepare apps """
    fetch_apps(data, options.profile_path, options.distribution_path)

    """ Generate internal JSON based on mnc/mcc """
    fetch_conf(data, options.profile_path, options.distribution_path)

if __name__ == "__main__":
  main()
