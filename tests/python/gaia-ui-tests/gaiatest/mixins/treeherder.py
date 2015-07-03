# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import gzip
import hashlib
import os
import socket
import tempfile
import time
from urlparse import urljoin, urlparse
import uuid

import boto
from mozdevice import ADBDevice
from mozlog.structured.formatters import TbplFormatter
from mozlog.structured.handlers import LogLevelFilter, StreamHandler
import mozversion
import requests
from thclient import TreeherderClient, TreeherderJobCollection

# The device_group_map maps by device name then
# device_firmware_version_release to denote the underlying Android version
DEVICE_GROUP_MAP = {
    'flame': {
        '4.4.2': {
            'name': 'Flame KitKat Device Image',
            'symbol': 'Flame-KK'},
        '4.3': {
            'name': 'Flame Device Image',
            'symbol': 'Flame'}
    }}


class S3UploadError(Exception):

    def __init__(self):
        Exception.__init__(self, 'Error uploading to S3')


class TreeherderOptionsMixin(object):

    def __init__(self, **kwargs):
        treeherder = self.add_option_group('Treeherder')
        treeherder.add_option(
            '--treeherder',
            default='https://treeherder.mozilla.org/',
            dest='treeherder_url',
            help='Location of Treeherder instance (default: %default). You '
                 'must set the TREEHERDER_KEY and TREEHERDER_SECRET '
                 'environment variables for posting to Treeherder. If you '
                 'want to post attachments you will also need to set the '
                 'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment '
                 'variables.',
            metavar='URL')


class TreeherderTestRunnerMixin(object):

    def __init__(self, treeherder_url='https://treeherder.mozilla.org/',
                 **kwargs):
        self.treeherder_url = treeherder_url
        required_envs = ['TREEHERDER_KEY', 'TREEHERDER_SECRET']
        if all([os.environ.get(v) for v in required_envs]):
            self.mixin_run_tests.append(self.post_to_treeherder)
        else:
            self.logger.info(
                'Results will not be posted to Treeherder. Please set the '
                'following environment variables to enable Treeherder '
                'reports: %s' % ', '.join([
                    v for v in required_envs if not os.environ.get(v)]))

    def post_to_treeherder(self, tests):
        version = mozversion.get_version(
            binary=self.bin, sources=self.sources,
            dm_type='adb', device_serial=self.device_serial)

        job_collection = TreeherderJobCollection()
        job = job_collection.get_job()

        device = version.get('device_id')
        device_firmware_version_release = \
            version.get('device_firmware_version_release')

        if not device:
            self.logger.error('Submitting to Treeherder is currently limited '
                              'to devices.')
            return

        try:
            group = DEVICE_GROUP_MAP[device][device_firmware_version_release]
            job.add_group_name(group['name'])
            job.add_group_symbol(group['symbol'])
            job.add_job_name('Gaia Python Integration Test (%s)' % group['symbol'])
            job.add_job_symbol('Gip')
        except KeyError:
            self.logger.error('Unknown device id: %s or device firmware '
                              'version: %s. Unable to determine Treeherder '
                              'group. Supported devices: %s'
                              % (device, device_firmware_version_release,
                                 ['%s: %s' % (k, [fw for fw in v.keys()])
                                  for k, v in DEVICE_GROUP_MAP.iteritems()]))
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

        ci_url = os.environ.get('BUILD_URL')
        if ci_url:
            job_details.append({
                'url': ci_url,
                'value': ci_url,
                'content_type': 'link',
                'title': 'CI build:'})

        # Attach logcat
        adb_device = ADBDevice(self.device_serial)
        with tempfile.NamedTemporaryFile(suffix='logcat.txt') as f:
            f.writelines(adb_device.get_logcat())
            self.logger.debug('Logcat stored in: %s' % f.name)
            try:
                url = self.upload_to_s3(f.name)
                job_details.append({
                    'url': url,
                    'value': 'logcat.txt',
                    'content_type': 'link',
                    'title': 'Log:'})
            except S3UploadError:
                job_details.append({
                    'value': 'Failed to upload logcat.txt',
                    'content_type': 'text',
                    'title': 'Error:'})

        # Attach log files
        handlers = [handler for handler in self.logger.handlers
                    if isinstance(handler, StreamHandler) and
                    os.path.exists(handler.stream.name)]
        for handler in handlers:
            path = handler.stream.name
            filename = os.path.split(path)[-1]
            try:
                url = self.upload_to_s3(path)
                job_details.append({
                    'url': url,
                    'value': filename,
                    'content_type': 'link',
                    'title': 'Log:'})
                # Add log reference
                if type(handler.formatter) is TbplFormatter or \
                        type(handler.formatter) is LogLevelFilter and \
                        type(handler.formatter.inner) is TbplFormatter:
                    job.add_log_reference(filename, url)
            except S3UploadError:
                job_details.append({
                    'value': 'Failed to upload %s' % filename,
                    'content_type': 'text',
                    'title': 'Error:'})

        # Attach reports
        for report in [self.html_output]:
            if report is not None:
                filename = os.path.split(report)[-1]
                try:
                    url = self.upload_to_s3(report)
                    job_details.append({
                        'url': url,
                        'value': filename,
                        'content_type': 'link',
                        'title': 'Report:'})
                except S3UploadError:
                    job_details.append({
                        'value': 'Failed to upload %s' % filename,
                        'content_type': 'text',
                        'title': 'Error:'})

        if job_details:
            job.add_artifact('Job Info', 'json', {'job_details': job_details})

        job_collection.add(job)

        # Send the collection to Treeherder
        url = urlparse(self.treeherder_url)
        client = TreeherderClient(protocol=url.scheme, host=url.hostname)
        self.logger.debug('Sending results to Treeherder: %s' %
                          job_collection.to_json())
        client.post_collection(project, os.environ.get('TREEHERDER_KEY'),
            os.environ.get('TREEHERDER_SECRET'), job_collection)
        self.logger.info('Results are available to view at: %s' % (
            urljoin(self.treeherder_url, '/ui/#/jobs?repo=%s&revision=%s' % (
                project, revision))))

    def upload_to_s3(self, path):
        if not hasattr(self, '_s3_bucket'):
            try:
                self.logger.debug('Connecting to S3')
                conn = boto.connect_s3()
                bucket = os.environ.get('S3_UPLOAD_BUCKET', 'gaiatest')
                if conn.lookup(bucket):
                    self.logger.debug('Getting bucket: %s' % bucket)
                    self._s3_bucket = conn.get_bucket(bucket)
                else:
                    self.logger.debug('Creating bucket: %s' % bucket)
                    self._s3_bucket = conn.create_bucket(bucket)
                self._s3_bucket.set_acl('public-read')
            except boto.exception.NoAuthHandlerFound:
                self.logger.info(
                    'Please set the following environment variables to enable '
                    'uploading of artifacts: %s' % ', '.join([v for v in [
                        'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'] if not
                        os.environ.get(v)]))
                raise S3UploadError()
            except boto.exception.S3ResponseError as e:
                self.logger.warning('Upload to S3 failed: %s' % e.message)
                raise S3UploadError()

        h = hashlib.sha512()
        with open(path, 'rb') as f:
            for chunk in iter(lambda: f.read(1024 ** 2), b''):
                h.update(chunk)
        _key = h.hexdigest()
        key = self._s3_bucket.get_key(_key)
        if not key:
            self.logger.debug('Creating key: %s' % _key)
            key = self._s3_bucket.new_key(_key)
        ext = os.path.splitext(path)[-1]
        if ext == '.log':
            key.set_metadata('Content-Type', 'text/plain')

        with tempfile.NamedTemporaryFile('w+b', suffix=ext) as tf:
            self.logger.debug('Compressing: %s' % path)
            with gzip.GzipFile(path, 'wb', fileobj=tf) as gz:
                with open(path, 'rb') as f:
                    gz.writelines(f)
            tf.flush()
            tf.seek(0)
            key.set_metadata('Content-Encoding', 'gzip')
            self.logger.debug('Setting key contents from: %s' % tf.name)
            key.set_contents_from_filename(tf.name)

        key.set_acl('public-read')
        blob_url = key.generate_url(expires_in=0,
                                    query_auth=False)
        self.logger.info('File %s uploaded to: %s' % (path, blob_url))
        return blob_url
