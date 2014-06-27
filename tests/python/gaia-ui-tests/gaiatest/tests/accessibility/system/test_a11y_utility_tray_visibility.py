# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.system.app import System
from gaiatest.apps.system.regions.status_bar import StatusBar
from gaiatest.apps.system.regions.utility_tray import UtilityTray


class TestUtilityTrayVisibilityAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.system = System(self.marionette)
        self.status_bar = StatusBar(self.marionette)
        self.utility_tray = UtilityTray(self.marionette)

    def test_a11y_utility_tray_visibility(self):
        self.system.wait_for_status_bar_displayed()

        utility_tray_container = self.marionette.find_element(*self.system._utility_tray_locator)

        # Utility tray is hidden by default.
        self.assertTrue(self.accessibility.is_hidden(utility_tray_container))

        self.status_bar.a11y_wheel_status_bar_time()

        # Utility tray should now be visible.
        self.assertTrue(self.accessibility.is_visible(utility_tray_container))

        self.utility_tray.a11y_wheel_utility_tray_grippy()

        # Utility tray should now be hidden.
        self.assertTrue(self.accessibility.is_hidden(utility_tray_container))
