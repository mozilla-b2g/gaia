from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestFunctionalitySimManager(GaiaTestCase):

    def test_functionality_sim_manager(self):
        
        settings = Settings(self.marionette)
        settings.launch()
        sim_manager_settings = settings.open_sim_manager()

        sim_manager_settings.select_outgoing_calls("-1")
        sim_manager_settings.select_data("-1")
        sim_manager_settings.select_outgoing_messages("1")
