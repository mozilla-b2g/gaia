# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery


class TestGallery(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # add photo to storage
        self.push_resource('IMG_0001.jpg', destination='DCIM/100MZLLA')

    def test_gallery_view(self):
        # https://moztrap.mozilla.org/manage/case/1326/

        gallery = Gallery(self.marionette)
        gallery.launch()
        gallery.wait_for_files_to_load(1)

        image = gallery.tap_first_gallery_item()
        self.assertIsNotNone(image.current_image_source)

        #  Verify that the screen orientation is in portrait mode
        self.assertTrue(image.is_photo_toolbar_displayed)
        self.assertEqual('portrait-primary', self.screen_orientation)
        self.assertEqual(self.screen_width, image.photo_toolbar_width)

        #  Change the screen orientation to landscape mode and verify that the screen is in landscape mode
        self.change_orientation('landscape-primary')

        # Here we sleep only to give visual feedback when observing the test run
        time.sleep(1)
        self.assertTrue(image.is_photo_toolbar_displayed)
        self.assertEqual('landscape-primary', self.screen_orientation)
        self.assertEqual(self.screen_width, image.photo_toolbar_width)

        #  Unlock the screen so that it can be changed back to portrait mode
        self.marionette.execute_script('window.screen.mozUnlockRotation')

        #  Change the screen orientation back to portrait-primary and verify the screen is in portrait mode
        self.change_orientation('portrait-primary')

        # Here we sleep only to give visual feedback when observing the test run
        time.sleep(1)
        self.assertTrue(image.is_photo_toolbar_displayed)
        self.assertEqual('portrait-primary', self.screen_orientation)
        self.assertEqual(self.screen_width, image.photo_toolbar_width)

    def tearDown(self):
        self.marionette.execute_script('window.screen.mozUnlockRotation')
        GaiaTestCase.tearDown(self)
