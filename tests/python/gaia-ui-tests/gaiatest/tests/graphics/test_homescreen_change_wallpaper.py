# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestHomescreenChangeWallpaper(GaiaImageCompareTestCase):

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)
        # add photo to storage
        self.push_resource('IMG_0001.jpg')

    def test_homescreen_change_wallpaper_from_gallery(self):
        """
        https://moztrap.mozilla.org/manage/case/1902/
        reusing /functional/homescreen/test_homescreen_change_wallpaper.py script
        """
        # wait until the homescreen is fully drawn
        time.sleep(3)
        self.take_screenshot()
        homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

        default_wallpaper_settings = self.data_layer.get_setting('wallpaper.image')
        contextmenu = homescreen.open_context_menu()
        self.take_screenshot()

        activities = contextmenu.tap_change_wallpaper()
        self.take_screenshot()

        # select gallery
        gallery = activities.tap_gallery()

        # go through the crop process
        gallery.wait_for_thumbnails_to_load()
        self.take_screenshot()
        gallery.thumbnails[0].tap()

        from gaiatest.apps.gallery.regions.crop_view import CropView
        crop_view = CropView(self.marionette)
        self.take_screenshot()

        # can't actually crop the element
        crop_view.tap_crop_done()

        # check that the wallpaper has changed
        new_wallpaper_settings = self.data_layer.get_setting('wallpaper.image')
        self.assertNotEqual(default_wallpaper_settings, new_wallpaper_settings)
        self.take_screenshot()
