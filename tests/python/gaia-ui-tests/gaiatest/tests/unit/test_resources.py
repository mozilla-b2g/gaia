# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestResources(GaiaTestCase):

    filename = 'IMG_0001.jpg'
    remote_path = 'DCIM/100MZLLA'
    test_data = [
        # no remote path, one file
        {'resource': filename, 'count': 1, 'files': [filename]},
        # no remote path, two files
        {'resource': filename, 'count': 2,
         'files': ['IMG_0001_1.jpg', 'IMG_0001_2.jpg']},
        # remote path, one file
        {'resource': filename, 'path': remote_path, 'count': 1,
         'files': [filename]},
        # remote path, two files
        {'resource': filename, 'path': remote_path, 'count': 2,
         'files': ['IMG_0001_1.jpg', 'IMG_0001_2.jpg']}]

    def test_push_resources(self):
        for data in self.test_data:
            print 'Test data: %s' % data
            remote_path = None
            if data.get('path'):
                remote_path = '/'.join([self.device.storage_path,
                                        data['path']])
            self.push_resource(data['resource'], remote_path, data['count'])
            for filename in data['files']:
                print '/'.join([remote_path or self.device.storage_path, filename])
                self.assertTrue(self.device.file_manager.file_exists('/'.join([
                    remote_path or self.device.storage_path, filename])))
