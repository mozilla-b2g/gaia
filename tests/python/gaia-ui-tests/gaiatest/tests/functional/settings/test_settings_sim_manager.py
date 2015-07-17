# This is Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.marionette_test import parameterized

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestChangeSimManager(GaiaTestCase):

    @parameterized('1', 0, 'SIM 1')
    @parameterized('2', 1, 'SIM 2')
    def test_change_manager_default_sim(self, default_sim_value, default_sim_option):
        """
        https://moztrap.mozilla.org/manage/case/10590/
        """

        # Initialize to the other SIM so the confirmation window will show when selecting data
        other_sim = 1 if default_sim_value == 0 else 0
        self.data_layer.set_setting('ril.telephony.defaultServiceId', other_sim)
        self.data_layer.set_setting('ril.sms.defaultServiceId', other_sim)
        self.data_layer.set_setting('ril.data.defaultServiceId', other_sim)

        settings = Settings(self.marionette)
        settings.launch()
        sim_manager_settings = settings.open_sim_manager()

        sim_manager_settings.select_outgoing_calls(default_sim_option)
        sim_manager_settings.select_outgoing_messages(default_sim_option)
        sim_manager_settings.select_data(default_sim_option)

        self.assertEqual(default_sim_option, sim_manager_settings.sim_for_outgoing_calls)
        self.assertEqual(default_sim_option, sim_manager_settings.sim_for_outgoing_messages)
        self.assertEqual(default_sim_option, sim_manager_settings.sim_for_data)

        self.assertEqual(self.data_layer.get_setting('ril.telephony.defaultServiceId'), default_sim_value)
        self.assertEqual(self.data_layer.get_setting('ril.sms.defaultServiceId'), default_sim_value)
        self.assertEqual(self.data_layer.get_setting('ril.data.defaultServiceId'), default_sim_value)
