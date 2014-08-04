# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.system.app import System


class TestSoftwareButtonsVisibilityAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.system = System(self.marionette)

    def test_a11y_software_buttons_visibility(self):

        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.system._software_home_button_locator)))

        # Enable software button visibility
        self.data_layer.set_setting('software-button.enabled', True)

        # # Software buttons should now be visible
        self.system.wait_for_software_home_button_displayed()
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *self.system._software_home_button_locator)))

        # # Disable software button visibility
        self.data_layer.set_setting('software-button.enabled', False)

        # # Software buttons should now be invisible
        self.system.wait_for_software_home_button_not_displayed()
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.system._software_home_button_locator)))
