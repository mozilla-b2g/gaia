# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestHomescreenChangeWallpaper(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # add photo to storage
        self.push_resource('IMG_0001.jpg')

    def test_homescreen_change_wallpaper_from_gallery(self):
        """
        https://moztrap.mozilla.org/manage/case/1902/
        """

        homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

        default_wallpaper_settings = self.data_layer.get_setting('wallpaper.image')
        contextmenu = homescreen.open_context_menu()
        activities = contextmenu.tap_change_wallpaper()

        # select gallery
        gallery = activities.tap_gallery()

        # go through the crop process
        gallery.wait_for_thumbnails_to_load()
        gallery.thumbnails[0].tap()

        from gaiatest.apps.gallery.regions.crop_view import CropView
        crop_view = CropView(self.marionette)

        # can't actually crop the element
        crop_view.tap_crop_done()

        # check that the wallpaper has changed
        new_wallpaper_settings = self.data_layer.get_setting('wallpaper.image')
        self.assertNotEqual(default_wallpaper_settings, new_wallpaper_settings)
