# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestResources(GaiaTestCase):

    filename = 'IMG_0001.jpg'

    def test_push_resource(self):
        self.push_resource(self.filename)
        # An absolute path is returned, so just check the filename
        self.assertTrue(any(f.endswith(self.filename) for f in
                        self.data_layer.media_files))

    def test_push_multiple_resources(self):
        count = 5
        self.push_resource(self.filename, count)

        for i in range(1, count + 1):
            remote_filename = '_%s.'.join(iter(self.filename.split('.'))) % i
            # An absolute path is returned, so just check the filename
            self.assertTrue(any(f.endswith(remote_filename) for f in
                            self.data_layer.media_files))
