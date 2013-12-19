# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestCleanupSDCard(GaiaTestCase):

    def test_cleanup_scard(self):
        self.assertEqual(len(self.data_layer.media_files), 0)

        # push media files
        self.push_resource('IMG_0001.jpg', destination='DCIM/100MZLLA')
        self.push_resource('VID_0001.3gp', destination='DCIM/100MZLLA')
        self.push_resource('MUS_0001.mp3')
        self.assertEqual(len(self.data_layer.media_files), 3)

        self.cleanup_sdcard()
        self.assertEqual(len(self.data_layer.media_files), 0)
