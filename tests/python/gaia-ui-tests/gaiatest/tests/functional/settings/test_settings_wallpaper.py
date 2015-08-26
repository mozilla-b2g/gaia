# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings
from gaiatest.apps.system.app import System


class TestWallpaper(GaiaTestCase):

    def test_change_wallpaper(self):
        """https://moztrap.mozilla.org/manage/case/3449/"""

        system = System(self.marionette)
        default_wallpaper = system.wallpaper_properties

        settings = Settings(self.marionette)
        settings.launch()
        display_settings = settings.open_display()

        activities_menu = display_settings.pick_wallpaper()
        wallpaper = activities_menu.tap_wallpaper()
        wallpaper.tap_wallpaper_by_index(1)

        self.marionette.switch_to_frame()
        new_wallpaper = system.wallpaper_properties

        self.assertNotEqual(default_wallpaper, new_wallpaper)
