# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import socket
import time
from urlparse import urljoin, urlparse
import uuid

import mozversion
import requests
from thclient import TreeherderRequest, TreeherderJobCollection

DEVICE_GROUP_MAP = {
    'flame': {
        'name': 'Flame Device Image',
        'symbol': 'Flame'},
    'msm7627a': {
        'name': 'Buri/Hamachi Device Image',
        'symbol': 'Buri/Hamac'}}


class TreeherderOptionsMixin(object):

    def __init__(self, **kwargs):
        self.add_option(
            '--ci-url',
            help='URL of the CI build running the tests.',
            metavar='URL')
        treeherder = self.add_option_group('Treeherder')
        treeherder.add_option(
            '--treeherder',
            action='store_true',
            default=False,
            help='Send test results to Treeherder.')
        treeherder.add_option(
            '--treeherder-url',
            default='https://treeherder.mozilla.org/',
            help='Location of Treeherder instance. Default: %default',
            metavar='URL')
        treeherder.add_option(
            '--treeherder-key',
            help='OAuth key for Treeherder instance.',
            metavar='KEY')
        treeherder.add_option(
            '--treeherder-secret',
            help='OAuth secret for Treeherder instance.',
            metavar='SECRET')


class TreeherderTestRunnerMixin(object):

    def __init__(self, ci_url=None, treeherder=False,
                 treeherder_url='https://treeherder.mozilla.org/',
                 treeherder_key=None, treeherder_secret=None, **kwargs):
        self.ci_url = ci_url
        self.treeherder_url = treeherder_url
        self.treeherder_key = treeherder_key
        self.treeherder_secret = treeherder_secret
        if treeherder:
            self.mixin_run_tests.append(self.post_to_treeherder)

    def post_to_treeherder(self, tests):
        self.logger.info('\nTREEHERDER\n----------')
        version = mozversion.get_version(
            binary=self.bin, sources=self.sources,
            dm_type='adb', device_serial=self.device_serial)

        job_collection = TreeherderJobCollection()
        job = job_collection.get_job()

        device = version.get('device_id')
        if not device:
            self.logger.error('Submitting to Treeherder is currently limited '
                              'to devices.')
            return

        try:
            group = DEVICE_GROUP_MAP[device]
            job.add_group_name(group['name'])
            job.add_group_symbol(group['symbol'])
            job.add_job_name('Gaia Python Integration Test (%s)' % device)
            job.add_job_symbol('Gip')
        except KeyError:
            self.logger.error('Unknown device id: %s, unable to determine '
                              'Treeherder group. Supported device ids: %s' % (
                                  device, DEVICE_GROUP_MAP.keys()))
            return

        # Determine revision hash from application revision
        revision = version['application_changeset']
        project = version['application_repository'].split('/')[-1]
        lookup_url = urljoin(
            self.treeherder_url,
            'api/project/%s/revision-lookup/?revision=%s' % (
                project, revision))
        self.logger.debug('Getting revision hash from: %s' % lookup_url)
        response = requests.get(lookup_url)
        response.raise_for_status()
        assert response.json(), 'Unable to determine revision hash for %s. ' \
                                'Perhaps it has not been ingested by ' \
                                'Treeherder?' % revision
        revision_hash = response.json()[revision]['revision_hash']
        job.add_revision_hash(revision_hash)
        job.add_project(project)
        job.add_job_guid(str(uuid.uuid4()))
        job.add_product_name('b2g')
        job.add_state('completed')

        # Determine test result
        if self.failed or self.unexpected_successes:
            job.add_result('testfailed')
        else:
            job.add_result('success')

        job.add_submit_timestamp(int(self.start_time))
        job.add_start_timestamp(int(self.start_time))
        job.add_end_timestamp(int(self.end_time))

        job.add_machine(socket.gethostname())
        job.add_build_info('b2g', 'b2g-device-image', 'x86')
        job.add_machine_info('b2g', 'b2g-device-image', 'x86')

        # All B2G device builds are currently opt builds
        job.add_option_collection({'opt': True})

        # TODO: Add log reference
        # job.add_log_reference()

        date_format = '%d %b %Y %H:%M:%S'
        job_details = [{
            'content_type': 'link',
            'title': 'Gaia revision:',
            'url': 'https://github.com/mozilla-b2g/gaia/commit/%s' %
                   version.get('gaia_changeset'),
            'value': version.get('gaia_changeset'),
        }, {
            'content_type': 'text',
            'title': 'Gaia date:',
            'value': version.get('gaia_date') and time.strftime(
                date_format, time.localtime(int(version.get('gaia_date')))),
        }, {
            'content_type': 'text',
            'title': 'Device identifier:',
            'value': version.get('device_id')
        }, {
            'content_type': 'text',
            'title': 'Device firmware (date):',
            'value': version.get('device_firmware_date') and time.strftime(
                date_format, time.localtime(int(
                    version.get('device_firmware_date')))),
        }, {
            'content_type': 'text',
            'title': 'Device firmware (incremental):',
            'value': version.get('device_firmware_version_incremental')
        }, {
            'content_type': 'text',
            'title': 'Device firmware (release):',
            'value': version.get('device_firmware_version_release')
        }]

        if self.ci_url:
            job_details.append({
                'url': self.ci_url,
                'value': self.ci_url,
                'content_type': 'link',
                'title': 'CI build:'})

        if job_details:
            job.add_artifact('Job Info', 'json', {'job_details': job_details})

        # TODO: Add XML/HTML reports as artifacts
        # job.add_artifact()

        job_collection.add(job)

        # Send the collection to Treeherder
        url = urlparse(self.treeherder_url)
        request = TreeherderRequest(
            protocol=url.scheme,
            host=url.hostname,
            project=project,
            oauth_key=self.treeherder_key,
            oauth_secret=self.treeherder_secret)
        self.logger.debug('Sending results to Treeherder: %s' %
                          job_collection.to_json())
        response = request.post(job_collection)
        self.logger.debug('Response: %s' % response.read())
        assert response.status == 200, 'Failed to send results!'
        self.logger.info('Results are available to view at: %s' % (
            urljoin(self.treeherder_url, '/ui/#/jobs?repo=%s&revision=%s' % (
                project, revision))))
