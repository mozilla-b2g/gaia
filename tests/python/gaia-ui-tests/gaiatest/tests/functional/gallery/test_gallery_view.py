# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery
from gaiatest.apps.system.app import System


class TestGallery(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # add photo to storage
        self.push_resource('IMG_0001.jpg')

    def test_gallery_view(self):
        """
        https://moztrap.mozilla.org/manage/case/14645/
        """

        screen_width = System(self.marionette).screen_width
        screen_height = System(self.marionette).screen_height_without_software_home_button

        gallery = Gallery(self.marionette)
        gallery.launch()
        gallery.wait_for_files_to_load(1)

        image = gallery.tap_first_gallery_item()
        self.assertIsNotNone(image.current_image_source)

        # Check that there are 5 options displayed beneath the picture
        self.assertEqual(len(image.photo_toolbar_options), 5)

        #  Verify that the screen orientation is in portrait mode
        self.assertTrue(image.is_photo_toolbar_displayed)
        self.assertEqual('portrait-primary', self.device.screen_orientation)
        self.assertEqual(screen_width, image.photo_toolbar_width)

        #  Change the screen orientation to landscape mode and verify that the screen is in landscape mode
        self.device.change_orientation('landscape-primary')

        # Here we sleep only to give visual feedback when observing the test run
        time.sleep(1)
        self.assertTrue(image.is_photo_toolbar_displayed)
        self.assertEqual('landscape-primary', self.device.screen_orientation)
        self.assertEqual(screen_height, image.photo_toolbar_width)

        #  Unlock the screen so that it can be changed back to portrait mode
        self.marionette.execute_script('window.screen.mozUnlockOrientation()')

        #  Change the screen orientation back to portrait-primary and verify the screen is in portrait mode
        self.device.change_orientation('portrait-primary')

        # Here we sleep only to give visual feedback when observing the test run
        time.sleep(1)
        self.assertTrue(image.is_photo_toolbar_displayed)
        self.assertEqual('portrait-primary', self.device.screen_orientation)
        self.assertEqual(screen_width, image.photo_toolbar_width)

    def tearDown(self):
        self.marionette.execute_script('window.screen.mozUnlockOrientation()')
        GaiaTestCase.tearDown(self)
