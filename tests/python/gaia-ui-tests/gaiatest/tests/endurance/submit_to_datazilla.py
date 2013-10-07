#!/usr/bin/env python
#
# How to submit gaia-ui endurance test results to Datazilla:
# 1) Attach a b2g device with an engineering build
# 2) Issue 'adb forward tcp:2828 tcp:2828' cmd
# 3) Run a gaia-ui endurance test, resulting in a checkpoint_*_summary.log results file
# 4) Keep the device connected, and turn on wifi (so device can get a macAddress), then
# 5) Run this script and provide the command line options/values, including '--print'
# 6) Review the results as displayed in the console, verify
# 7) To submit the results, repeat the cmd but use '--submit' instead of '--print'

from optparse import OptionParser
from StringIO import StringIO
import os
from urlparse import urlparse
import xml.dom.minidom
import zipfile
import time

import dzclient
import gaiatest
from marionette import Marionette
import mozdevice


class DatazillaPerfPoster(object):

    def __init__(self, marionette, datazilla_config=None, sources=None):
        self.marionette = marionette

        settings = gaiatest.GaiaData(self.marionette).all_settings  # get all settings
        mac_address = self.marionette.execute_script('return navigator.mozWifiManager && navigator.mozWifiManager.macAddress;')

        self.submit_report = True
        self.ancillary_data = {}

        if gaiatest.GaiaDevice(self.marionette).is_android_build:
            # get gaia, gecko and build revisions
            try:
                device_manager = mozdevice.DeviceManagerADB()
                app_zip = device_manager.pullFile('/data/local/webapps/settings.gaiamobile.org/application.zip')
                with zipfile.ZipFile(StringIO(app_zip)).open('resources/gaia_commit.txt') as f:
                    self.ancillary_data['gaia_revision'] = f.read().splitlines()[0]
            except zipfile.BadZipfile:
                # the zip file will not exist if Gaia has not been flashed to
                # the device, so we fall back to the sources file
                pass

            try:
                sources_xml = sources and xml.dom.minidom.parse(sources) or xml.dom.minidom.parseString(device_manager.catFile('system/sources.xml'))
                for element in sources_xml.getElementsByTagName('project'):
                    path = element.getAttribute('path')
                    revision = element.getAttribute('revision')
                    if not self.ancillary_data.get('gaia_revision') and path in 'gaia':
                        self.ancillary_data['gaia_revision'] = revision
                    if path in ['gecko', 'build']:
                        self.ancillary_data['_'.join([path, 'revision'])] = revision
            except:
                pass

        self.required = {
            'gaia revision': self.ancillary_data.get('gaia_revision'),
            'gecko revision': self.ancillary_data.get('gecko_revision'),
            'build revision': self.ancillary_data.get('build_revision'),
            'protocol': datazilla_config['protocol'],
            'host': datazilla_config['host'],
            'project': datazilla_config['project'],
            'branch': datazilla_config['branch'],
            'oauth key': datazilla_config['oauth_key'],
            'oauth secret': datazilla_config['oauth_secret'],
            'machine name': mac_address or 'unknown',
            'device name': datazilla_config['device_name'],
            'os version': settings.get('deviceinfo.os'),
            'id': settings.get('deviceinfo.platform_build_id')}

        for key, value in self.required.items():
            if not value:
                self.submit_report = False
                print '\nMissing required DataZilla field: %s' % key

        if not self.submit_report:
            print '\n***Reports will not be submitted to DataZilla***'

    def post_to_datazilla(self, results, app_name):
        # Prepare DataZilla results
        res = dzclient.DatazillaResult()
        test_suite = app_name.replace(' ', '_').lower()
        res.add_testsuite(test_suite)
        for metric in results.keys():
            res.add_test_results(test_suite, metric, results[metric])
        req = dzclient.DatazillaRequest(
            protocol=self.required.get('protocol'),
            host=self.required.get('host'),
            project=self.required.get('project'),
            oauth_key=self.required.get('oauth key'),
            oauth_secret=self.required.get('oauth secret'),
            machine_name=self.required.get('machine name'),
            os='Firefox OS',
            os_version=self.required.get('os version'),
            platform='Gonk',
            build_name='B2G',
            version='prerelease',
            revision=self.ancillary_data.get('gaia_revision'),
            branch=self.required.get('branch'),
            id=self.required.get('id'))

        # Send DataZilla results
        req.add_datazilla_result(res)
        for dataset in req.datasets():
            dataset['test_build'].update(self.ancillary_data)
            dataset['test_machine'].update({'type': self.required.get('device name')})
            print '\nSubmitting results to DataZilla: %s' % dataset
            response = req.send(dataset)
            print 'Response: %s\n' % response.read()


class dzOptionParser(OptionParser):
    def __init__(self, **kwargs):
        OptionParser.__init__(self, **kwargs)
        self.add_option('--file',
                        action='store',
                        dest='results_file',
                        metavar='str',
                        help='Json checkpoint results file from the endurance test')
        self.add_option('--dz-url',
                        action='store',
                        dest='datazilla_url',
                        default='https://datazilla.mozilla.org',
                        metavar='str',
                        help='datazilla server url (default: %default)')
        self.add_option('--dz-project',
                        action='store',
                        dest='datazilla_project',
                        metavar='str',
                        help='datazilla project name')
        self.add_option('--dz-branch',
                        action='store',
                        dest='datazilla_branch',
                        metavar='str',
                        help='datazilla branch name')
        self.add_option('--dz-device',
                        action='store',
                        dest='datazilla_device_name',
                        metavar='str',
                        help='datazilla device name')       
        self.add_option('--dz-key',
                        action='store',
                        dest='datazilla_key',
                        metavar='str',
                        help='oauth key for datazilla server')
        self.add_option('--dz-secret',
                        action='store',
                        dest='datazilla_secret',
                        metavar='str',
                        help='oauth secret for datazilla server')
        self.add_option('--sources',
                        action='store',
                        dest='sources',
                        metavar='str',
                        help='Optional path to sources.xml containing project revisions')
        self.add_option('--submit',
                        action='store_true',
                        dest='send_to_datazilla',
                        help='Send results to datazilla')
        self.add_option('--process-dir',
                        action='store',
                        dest='process_dir',
                        metavar='str',
                        help='Process all *_summary.log files in the given folder')

    def datazilla_config(self, options):
        if options.sources:
            if not os.path.exists(options.sources):
                raise Exception('--sources file does not exist')

        datazilla_url = urlparse(options.datazilla_url)
        datazilla_config = {
            'protocol': datazilla_url.scheme,
            'host': datazilla_url.hostname,
            'project': options.datazilla_project,
            'branch': options.datazilla_branch,
            'device_name': options.datazilla_device_name,
            'oauth_key': options.datazilla_key,
            'oauth_secret': options.datazilla_secret}
        return datazilla_config


def cli():
    parser = dzOptionParser(usage='%prog file [options]')
    options, args = parser.parse_args()

    # Ensure have all required options
    if (not options.datazilla_project or not options.datazilla_branch
        or not options.datazilla_key or not options.datazilla_secret):
        parser.print_help()
        parser.exit()

    # Either a single file or option to process all in given folder
    if (not options.results_file) and (not options.process_dir):
        parser.print_help()
        parser.exit()

    if options.results_file and options.process_dir:
        parser.print_help()
        parser.exit()

    # Ensure results file actually exists
    if options.results_file:
        if not os.path.exists(options.results_file):
            raise Exception('%s file does not exist' %options.results_file)
        
    if options.process_dir:
        if not os.path.exists(options.process_dir):
            raise Exception("Process all path '%s' does not exist" %options.process_dir) 

    # Parse config options
    datazilla_config = parser.datazilla_config(options)

    # Start marionette session
    marionette = Marionette(host='localhost', port=2828)  # TODO command line option for address
    marionette.start_session()

    # Create datazilla post object
    poster = DatazillaPerfPoster(marionette, datazilla_config=datazilla_config, sources=options.sources)

    # If was an error getting required values then poster.submit_report will be false;
    # if it is true then ok to submit if user wants to
    if poster.submit_report:
        if not options.send_to_datazilla:
            poster.submit_report = False

    # Parse checkpoint results from provided summary log file
    checkpoint_summary = {}
    results = {}
    summary_file_list = []

    if options.process_dir:
        # All files in the given path
        file_path = options.process_dir
        print "\nSearching for *_summary.log files in %s\n" % options.process_dir

        entire_file_list = os.listdir(file_path)

        if len(entire_file_list) == 0:
            raise Exception("No checkpoint *_summary.log files were found in the given path")
        for found_file in entire_file_list:
            if found_file.endswith("summary.log") and found_file != "avg_b2g_rss_suite_summary.log":
                summary_file_list.append("%s/%s" % (file_path, found_file))
        if len(summary_file_list) == 0:
            raise Exception("No checkpoint *_summary.log files were found in the given path")

        print "Found the following checkpoint summary files to process:\n"
        for x in summary_file_list:
            print "%s" % x
        print "\n" + "-" * 50         
    else:
        # Just one file
        summary_file_list = [options.results_file]

    for next_file in summary_file_list:

        # Clear results as only want results for current file being processed
        results = {}

        print "\nProcessing results in '%s'\n" % next_file

        summary_file = open(next_file, 'r')
        read_in = summary_file.read().split("\n")
        summary_file.close()

        for x in read_in:
            try:
                if x.find(':') != -1: # Ignore empty lines ie. last line of file which is empty
                    k, v = x.split(': ')
                    if k in "total_iterations" or k in "checkpoint_interval":
                        checkpoint_summary[k] = int(v)
                    elif k in "b2g_rss":
                        checkpoint_summary[k] = v.split(',') # list of strings
                        checkpoint_summary[k] = map(int, checkpoint_summary[k]) # list of ints
                    elif k in "test_name":
                        # Prefix test name so all tests are grouped together in datazilla
                        checkpoint_summary[k] = "endurance_" + v
                    else:
                        checkpoint_summary[k] = v
            except:
                raise Exception("Value missing from '%s', cannot proceed." % options.results_file)
    
        # Make sure we have app_under_test
        if (checkpoint_summary['app_under_test'] == "none"):
            raise Exception("Checkpoint summary file is missing value for 'app_under_test'. Cannot proceed.")
        
        # Results dictionary required format example
        # {'test_name': [180892, 180892, 181980, 181852, 180828, 182012, 183652, 182972, 183052, 183052]}
        results[checkpoint_summary['test_name']] = checkpoint_summary['b2g_rss']
    
        # Display the Datazilla configuration
        print 'Datazilla configuration:'
        print "\napplication (datazilla 'suite'): %s" % checkpoint_summary['app_under_test']
        for key, value in poster.required.items():
            print key + ":", value
    
        # Submit or print the results
        if poster.submit_report:
            #poster.post_to_datazilla(results, checkpoint_summary['test_name'])
            poster.post_to_datazilla(results, checkpoint_summary['app_under_test'])
        else:
            print "\nCheckpoint summary for test '%s':\n" % checkpoint_summary['test_name']
            print checkpoint_summary
            print '\nEndurance test results data:\n'
            print results
            print "\nTo submit results, fix any missing fields and use the '--submit' option.\n"

        if options.process_dir:
            # Sleep between submissions
            print "Pausing...\n"
            time.sleep(30)
            print "-" * 50

    if options.process_dir:
        print "\nFinished processing all files.\n"

if __name__ == '__main__':
    cli()
