# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestResources(GaiaTestCase):

    filename = 'IMG_0001.jpg'
    destination = 'DCIM/100MZLLA'

    def test_push_resource(self):
        self.push_resource('IMG_0001.jpg', destination=self.destination)
        # A fully qualified path is returned from the api
        remote_filepath = '/'.join(['/sdcard', self.destination, self.filename])
        self.assertTrue(remote_filepath in self.data_layer.media_files)

    def test_push_multiple_resources(self):
        count = 5
        self.push_resource(self.filename, count, destination=self.destination)

        for i in range(1, count + 1):
            remote_filename = '_%s.'.join(iter(self.filename.split('.'))) % i
            # A fully qualified path is returned from the api
            remote_filepath = '/'.join(['/sdcard', self.destination, remote_filename])
            self.assertTrue(remote_filepath in self.data_layer.media_files)
