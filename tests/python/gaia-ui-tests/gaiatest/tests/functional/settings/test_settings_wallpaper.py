# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestWallpaper(GaiaTestCase):

    # default wallpaper
    _default_wallpaper_settings = None
    _new_wallpaper_settings = None

    def test_change_wallpaper(self):
        # https://moztrap.mozilla.org/manage/case/3449/

        settings = Settings(self.marionette)
        settings.launch()
        display_settings = settings.open_display_settings()

        self._default_wallpaper_settings = self.data_layer.get_setting('wallpaper.image')

        # Open activities menu
        activities_menu = display_settings.pick_wallpaper()

        # choose the source as wallpaper app
        wallpaper = activities_menu.tap_wallpaper()
        wallpaper.tap_wallpaper_by_index(3)

        self.apps.switch_to_displayed_app()

        self._new_wallpaper_settings = self.data_layer.get_setting('wallpaper.image')

        self.assertNotEqual(self._default_wallpaper_settings, self._new_wallpaper_settings)
