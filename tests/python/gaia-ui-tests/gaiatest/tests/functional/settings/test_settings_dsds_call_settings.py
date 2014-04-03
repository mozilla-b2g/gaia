# This is Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings

class TestDSDSCallSettings(GaiaTestCase):

    def test_call_settings_for_two_sims(self):

        """https://moztrap.mozilla.org/manage/case/10675/"""
              
        # Launchs settings
        settings = Settings(self.marionette)
        settings.launch()

        # Open call settings
        call_settings = settings.open_call_settings()

        # Go into SIM 1
        call_settings.select_sim(1)

        # Check go into SIM 1 call settings (Verify call waiting is exists)
        self.assertTrue(call_settings.is_call_waiting_exist)

        # Back to previous page
        call_settings.go_back()
 
        # Go into SIM 2
        call_settings.select_sim(2)

        # Check go into SIM 2 call settings (Verify call waiting is exists)
        self.assertTrue(call_settings.is_call_waiting_exist) 
