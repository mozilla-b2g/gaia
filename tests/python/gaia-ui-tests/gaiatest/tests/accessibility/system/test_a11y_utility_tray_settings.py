# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.system.app import System


class TestUtilityTraySettingsAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.system = System(self.marionette)

    def test_a11y_utility_tray_settings(self):
        self.system.wait_for_status_bar_displayed()

        utility_tray = self.system.open_utility_tray()
        utility_tray.wait_for_notification_container_displayed()

        settings = utility_tray.a11y_click_quick_settings_full_app()

        # Make sure that Settings is the currently displayed app.
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.name == settings.name)
