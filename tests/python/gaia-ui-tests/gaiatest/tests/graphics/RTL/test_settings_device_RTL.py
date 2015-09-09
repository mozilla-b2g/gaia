# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase

from gaiatest.apps.settings.app import Settings


class TestSettingsRTL(GaiaImageCompareTestCase):
    def test_settings_app(self):

        settings = Settings(self.marionette)
        settings.launch()

        ###################### Device Information and its sub pages ######################
        device_info_page = settings.open_device_info()
        self.take_screenshot('dev_info')
        GaiaImageCompareTestCase.scroll(self.marionette, 'down', device_info_page.screen_element.rect['height'],
                                        screen = device_info_page.screen_element)
        self.take_screenshot('dev_info')

        moreinfo_page = device_info_page.tap_more_info()
        self.take_screenshot('dev_info-more_info')
        GaiaImageCompareTestCase.scroll(self.marionette, 'down', moreinfo_page.screen_element.rect['height'],
                                        screen=moreinfo_page.screen_element)
        self.take_screenshot('dev_info-more_info')
        settings.return_to_prev_menu(device_info_page.screen_element, device_info_page.moreinfo_screen_element)

        device_info_page.tap_your_rights()
        self.take_screenshot('dev_info-rights')
        GaiaImageCompareTestCase.scroll(self.marionette, 'down', device_info_page.rights_screen_element.rect['height'],
                                        screen = device_info_page.rights_screen_element)
        self.take_screenshot('dev_info-rights')
        settings.return_to_prev_menu(device_info_page.screen_element, device_info_page.rights_screen_element)

        device_info_page.tap_your_privacy()
        self.take_screenshot('dev_info-privacy')
        settings.return_to_prev_menu(device_info_page.screen_element, device_info_page.privacy_screen_element)

        device_info_page.tap_legal_info()
        device_info_page.tap_open_source_notices()  # Not checking the entire licensing document
        self.take_screenshot('dev_info-opensource_notice')
        settings.return_to_prev_menu(device_info_page.legal_screen_element, device_info_page.notice_screen_element)

        device_info_page.tap_obtaining_source_code()  # Not checking the entire licensing document
        self.take_screenshot('dev_info-sourcecode')
        settings.return_to_prev_menu(device_info_page.legal_screen_element, device_info_page.source_screen_element)
        self.take_screenshot('dev_info-legal_info')
        settings.return_to_prev_menu(device_info_page.screen_element, device_info_page.legal_screen_element)

        device_info_page.tap_reset_phone()
        self.take_screenshot('dev_info-reset')
        device_info_page.confirm_reset(False)

        device_info_page.tap_update_frequency()
        self.take_screenshot('dev_info-update-freq')
        device_info_page.exit_update_frequency()
        settings.return_to_prev_menu(settings.screen_element, device_info_page.screen_element)

        ###################### Download and its sub pages ######################
        dl_page = settings.open_downloads()
        self.take_screenshot('downloads')
        settings.return_to_prev_menu(settings.screen_element, dl_page.screen_element)

        ###################### Battery and its sub pages ######################
        battery_page = settings.open_battery()
        self.take_screenshot('battery')
        battery_page.tap_turn_on_auto()
        self.take_screenshot('battery-turnon_options')
        battery_page.select('never')
        settings.return_to_prev_menu(settings.screen_element, battery_page.screen_element)

        ###################### Accessibility and its sub pages ######################
        access_page = settings.open_accessibility()
        color_page = access_page.open_color_settings()
        color_page.toggle_filters()
        self.take_screenshot('accessibility-color')
        color_page.toggle_filters()  # set the filter to the original position
        settings.return_to_prev_menu(access_page.screen_element, color_page.screen_element)
        self.take_screenshot('accessibility')
        settings.return_to_prev_menu(settings.screen_element, access_page.screen_element)

        ###################### Improve Firefox OS and its sub pages ######################
        improve_page = settings.open_improve()
        self.take_screenshot('improve')
        GaiaImageCompareTestCase.scroll(self.marionette, 'down', improve_page.screen_element.rect['height'],
                                        screen=improve_page.screen_element)
        self.take_screenshot('improve')
        settings.return_to_prev_menu(settings.screen_element, improve_page.screen_element)

        ###################### Help page ######################
        settings.open_help()
        self.take_screenshot('help')
