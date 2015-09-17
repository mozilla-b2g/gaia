from marionette.marionette_test import parameterized

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestFunctionalitySimManager(GaiaTestCase):

    @parameterized('1', 1, 'SIM 2')
    def test_functionality_sim_manager(self, default_sim_value, default_sim_option):

        settings = Settings(self.marionette)
        settings.launch()
        sim_manager_settings = settings.open_sim_manager()

        sim_manager_settings.select_outgoing_calls(default_sim_value)
        sim_manager_settings.select_data(default_sim_value)
        sim_manager_settings.select_outgoing_messages(default_sim_option)
