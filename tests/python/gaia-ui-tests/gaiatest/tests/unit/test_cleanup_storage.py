# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestCleanupSDCard(GaiaTestCase):

    def test_cleanup_scard(self):
        root = self.device.manager.deviceRoot
        self.assertEqual(len(self.device.manager.listFiles(root)), 0)

        # push media files
        self.push_resource('IMG_0001.jpg')
        self.push_resource('VID_0001.3gp')
        # simulate pushing a non-media file by changing the filename
        self.push_resource('IMG_0001.jpg', destination='IMG.FILE')

        self.assertEqual(len(self.device.manager.listFiles(root)), 3)

        self.cleanup_storage()
        self.assertEqual(len(self.device.manager.listFiles(root)), 0)
