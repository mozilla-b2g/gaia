from marionette.marionette_test import parameterized

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestFunctionalitySimManager(GaiaTestCase):
 
    @parameterized('0', 0, 'SIM 1')
    @parameterized('1', 1, 'SIM 2')
    def test_functionality_sim_manager(self, default_sim_value, default_sim_option):

        # Initialize to the other SIM so the confirmation window will show when selecting data
        other_sim = 1 if default_sim_value == 0 else 0

        self.data_layer.set_setting('ril.telephony.defaultServiceId', other_sim)
        self.data_layer.set_setting('ril.sms.defaultServiceId', other_sim)
        self.data_layer.set_setting('ril.data.defaultServiceId', other_sim)

        settings = Settings(self.marionette)
        settings.launch()
        sim_manager_settings = settings.open_sim_manager()

        sim_manager_settings.select_outgoing_calls(default_sim_value)
        sim_manager_settings.select_data(default_sim_value)
        sim_manager_settings.select_outgoing_messages(default_sim_option)

        self.assertEqual(default_sim_value, sim_manager_settings.sim_for_outgoing_calls)
        self.assertEqual(default_sim_value, sim_manager_settings.sim_for_data)
        self.assertEqual(default_sim_option, sim_manager_settings.sim_for_outgoing_messages)

        self.assertEqual(self.data_layer.get_setting('ril.telephony.defaultServiceId'), default_sim_value)
        self.assertEqual(self.data_layer.get_setting('ril.sms.defaultServiceId'), default_sim_option)
        self.assertEqual(self.data_layer.get_setting('ril.data.defaultServiceId'), default_sim_value)
