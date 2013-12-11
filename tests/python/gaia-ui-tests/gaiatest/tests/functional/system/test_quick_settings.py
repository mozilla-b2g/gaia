# -*- coding: iso-8859-15 -*-
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.system.app import System


class TestQuickSettingsButton(GaiaTestCase):

    def test_quick_settings_button(self):
        system = System(self.marionette)

        # Expand the utility tray
        utility_tray = system.open_utility_tray()
        utility_tray.wait_for_notification_container_displayed()

        #tap the settings button
        utility_tray.tap_settings_button()

        #wait for and assert that settings app is launched
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == "Settings")
