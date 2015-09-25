from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings
from marionette_driver import Wait


class TestForgetWifi(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.data_layer.disable_wifi()

    def test_connect_to_wifi_and_forget_active_wifi(self):
        """
        https://moztrap.mozilla.org/manage/case/15898/
        """

        settings = Settings(self.marionette)
        settings.launch()

        wifi_settings = settings.open_wifi()

        self.assertFalse(wifi_settings.is_wifi_enabled, "WiFi should be disabled")
        wifi_settings.enable_wifi()
        self.assertTrue(wifi_settings.is_wifi_enabled, "WiFi should be enabled")
        wifi_settings.connect_to_network(self.testvars['wifi'])

        wifi_settings.tap_active_wifi()
        wifi_settings.tap_forget_wifi()
        Wait(self.marionette).until(lambda m: self.data_layer.is_wifi_connected() == False)
