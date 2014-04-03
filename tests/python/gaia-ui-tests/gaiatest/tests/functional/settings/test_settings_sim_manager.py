# This is Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestChangeSimManager(GaiaTestCase):

    def test_change_sim_manager_default(self):
        """https://moztrap.mozilla.org/manage/case/10590/"""
        
        # Check settings before change, all set to SIM 1
        self.assertEqual(self.data_layer.get_setting('ril.telephony.defaultServiceId'), 0)
        self.assertEqual(self.data_layer.get_setting('ril.sms.defaultServiceId'), 0)
        self.assertEqual(self.data_layer.get_setting('ril.data.defaultServiceId'), 0)
        
        # Launchs settings
        settings = Settings(self.marionette)
        settings.launch()

        # Open sim manager
        sim_manager_settings = settings.open_sim_manager_settings()

        # Change default sim for calls, outgoing messages and data
        # SIM index start with 0; '1' means 2nd SIM 
        # UI shows 'SIM 2' for sim in index 1
        sim_manager_settings.select_outgoing_calls(sim=2)
        sim_manager_settings.select_outgoing_messages(sim=2)
        sim_manager_settings.select_data(sim=2)

        # Verify UI settings has been changed
        # SIM index start with 0; '1' means 2nd SIM 
        self.assertEqual(u'1', sim_manager_settings.sim_for_outgoing_calls)
        self.assertEqual(u'1', sim_manager_settings.sim_for_outgoing_messages)
        self.assertEqual(u'1', sim_manager_settings.sim_for_data)

        # Verify settings after change, all set to SIM 2
        self.assertEqual(self.data_layer.get_setting('ril.telephony.defaultServiceId'), 1)
        self.assertEqual(self.data_layer.get_setting('ril.sms.defaultServiceId'), 1)
        self.assertEqual(self.data_layer.get_setting('ril.data.defaultServiceId'), 1)
