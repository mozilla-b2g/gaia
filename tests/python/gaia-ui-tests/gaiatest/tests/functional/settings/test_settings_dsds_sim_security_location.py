# This is Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestDSDSSimSecurityLocation(GaiaTestCase):

    _sim_security_locator = (By.CSS_SELECTOR, 'span[data-l10n-id="simSecurity"]')

    def test_sim_security_location(self):
        """https://moztrap.mozilla.org/manage/case/10665/"""
              
        settings = Settings(self.marionette)
        settings.launch()

        # Verify SIM security NOT displayed
        self.wait_for_element_not_displayed(*self._sim_security_locator)

        # Open SIM manager
        sim_manager_settings = settings.open_sim_manager_settings()       

        # Verify SIM security displayed
        self.assertTrue(sim_manager_settings.is_sim_security_displayed)
