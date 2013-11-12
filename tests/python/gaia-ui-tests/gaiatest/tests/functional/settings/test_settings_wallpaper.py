# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestWallpaper(GaiaTestCase):

    # default wallpaper
    _default_wallpaper_src = None

    def test_change_wallpaper(self):
        # https://moztrap.mozilla.org/manage/case/3449/

        settings = Settings(self.marionette)
        settings.launch()
        display_settings = settings.open_display_settings()

        self._default_wallpaper_src = display_settings.wallpaper_preview_src

        display_settings.choose_wallpaper(3)

        self.assertNotEqual(display_settings.wallpaper_preview_src[0:24], self._default_wallpaper_src[0:24])
