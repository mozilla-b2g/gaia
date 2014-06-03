# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestCleanupStorage(GaiaTestCase):

    test_data = [
        # remote path
        {'resource': 'IMG_0001.jpg', 'path': 'DCIM/100MZLLA'},
        # no remote path
        {'resource': 'MUS_0001.mp3'}]

    def test_cleanup_storage(self):
        for data in self.test_data:
            print 'Test data: %s' % data
            remote_path = None
            if data.get('path'):
                remote_path = '/'.join([self.device.storage_path,
                                        data['path']])
            self.push_resource(data['resource'], remote_path)

        self.cleanup_storage()

        for data in self.test_data:
            print 'Test data: %s' % data
            remote_path = None
            if data.get('path'):
                remote_path = '/'.join([self.device.storage_path,
                                        data['path']])
            self.assertFalse(self.device.file_manager.file_exists('/'.join([
                remote_path or self.device.storage_path, data['resource']])))
