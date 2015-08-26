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

        ###################### Device Information and its sub pages ######################
        device_info_page = settings.open_device_info()
        self.take_screenshot('dev_info')
        GaiaImageCompareTestCase.scroll(self.marionette, 'down', device_info_page.screen_element.size['height'],
                                        screen = device_info_page.screen_element)
        self.take_screenshot('dev_info')

        moreinfo_page = device_info_page.tap_more_info()
        self.take_screenshot('dev_info-more_info')
        GaiaImageCompareTestCase.scroll(self.marionette, 'down', device_info_page.screen_element.size['height'],
                                        screen = moreinfo_page.screen)
        self.take_screenshot('dev_info-more_info')
        settings.return_to_prev_menu(device_info_page.screen_element)

        device_info_page.tap_reset_phone()
        self.take_screenshot('dev_info-reset')
        device_info_page.confirm_reset(False)

        device_info_page.tap_update_frequency()
        self.take_screenshot('dev_info-update-freq')
        device_info_page.exit_update_frequency()
        settings.return_to_prev_menu(settings.screen_element)

        ### Downloads page
        settings.open_downloads()
        self.take_screenshot('downloads')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_battery()
        self.take_screenshot('battery')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_accessibility()
        self.take_screenshot('accessibility')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_developer()
        self.take_screenshot('developer')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_improve()
        self.take_screenshot('improve')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_help()
        self.take_screenshot('help')
        settings.return_to_prev_menu(settings.screen_element)
