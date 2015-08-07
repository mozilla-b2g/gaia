# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from marionette_driver import Wait

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsRTL(GaiaImageCompareTestCase):
    def test_settings_app(self):

        settings = Settings(self.marionette)
        settings.launch()

        settings.open_media_storage()
        self.take_screenshot('media_storage')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_application_storage()
        self.take_screenshot('application_storage')
        settings.return_to_prev_menu(settings.screen_element)
