# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from marionette_driver import Wait

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsRTL(GaiaImageCompareTestCase):
    def test_settings_app(self):

        settings = Settings(self.marionette)
        settings.launch()

        # opening each subpage in Settings menu.  Privacy Control is not opened, because it is a separate app
        #some subpages have their own subpages, and they need to be opened as well.
        settings.open_wifi()
        self.take_screenshot('wifi')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_sim_manager()
        self.take_screenshot('sim_manager')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_call()
        self.take_screenshot('call')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_message()
        self.take_screenshot('message')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_cell_and_data()
        self.take_screenshot('cell_and_data')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_bluetooth()
        self.take_screenshot('bluetooth')
        settings.return_to_prev_menu(settings.screen_element)

        ##################### Internet sharing and its subpages ######################
        internet_settings_page = settings.open_internet_sharing()
        self.take_screenshot('internet_sharing')
        GaiaImageCompareTestCase.scroll(self.marionette, 'down', internet_settings_page.screen_element.size['height'],
                                        screen = internet_settings_page.screen_element)

        self.take_screenshot('internet_sharing')
        hotspot_page = internet_settings_page.tap_hotspot_settings()
        self.take_screenshot('internet_sharing-hotspot')
        hotspot_page.tap_security_settings()
        self.take_screenshot('internet_sharing-hotspot-security')
        hotspot_page.confirm_security_settings()
        settings.return_to_prev_menu(internet_settings_page.screen_element)
        settings.return_to_prev_menu(settings.screen_element)
