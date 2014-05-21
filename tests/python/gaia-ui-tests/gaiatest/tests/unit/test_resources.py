# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestResources(GaiaTestCase):

    filename = 'IMG_0001.jpg'
    destination = 'DCIM/100MZLLA'
    storage_name = '/sdcard/'

    def setUp(self):
        GaiaTestCase.setUp(self)

        if self.device.is_desktop_b2g:
            # if desktopb2g, a non-volume based storage, DeviceStorage API does not return 'sdcard' in the path
            self.storage_name = ''

    def test_push_resource(self):
        self.push_resource('IMG_0001.jpg', destination=self.destination)
        # A fully qualified path is returned from the api, which may differ from the location we pushed the file to
        remote_filepath = self.storage_name + '/'.join([self.destination, self.filename])
        self.assertIn(remote_filepath, self.data_layer.media_files)

    def test_push_multiple_resources(self):
        count = 5
        self.push_resource(self.filename, count, destination=self.destination)

        for i in range(1, count + 1):
            remote_filename = '_%s.'.join(iter(self.filename.split('.'))) % i
            # A fully qualified path is returned from the api, which may differ from the location we pushed the file to
            remote_filepath = self.storage_name + '/'.join([self.destination, remote_filename])
            self.assertIn(remote_filepath, self.data_layer.media_files)
