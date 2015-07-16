# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsRTL(GaiaImageCompareTestCase):

    def test_settings_app(self):

        settings = Settings(self.marionette)
        settings.launch()

        self.take_screenshot('main')
        for i in range(0, 4):
            GaiaImageCompareTestCase.scroll(self.marionette, 'down',
                                            settings.screen_element.size['height'], screen=settings.screen_element)
            self.take_screenshot('main')

        #opening each subpage in Settings menu.  Privacy Control is not opened, because it is a separate app
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

        settings.open_internet_sharing()
        self.take_screenshot('internet_sharing')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_sound()
        self.take_screenshot('sound')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_display()
        self.take_screenshot('display')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_homescreen()
        self.take_screenshot('homescreen')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_search()
        self.take_screenshot('search')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_navigation()
        self.take_screenshot('navigation')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_notification()
        self.take_screenshot('notification')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_date_and_time()
        self.take_screenshot('date_and_time')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_language()
        self.take_screenshot('language')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_keyboard()
        self.take_screenshot('keyboard')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_themes()
        self.take_screenshot('themes')
        settings.return_to_prev_menu(settings.screen_element, gaia_header=False)

        settings.open_addons()
        self.take_screenshot('addons')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_achievements()
        self.take_screenshot('achievements')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_firefox_accounts()
        self.take_screenshot('firefox_accounts')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_findmydevice()
        self.take_screenshot('findmydevice')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_screen_lock()
        self.take_screenshot('screen_lock')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_app_permissions()
        self.take_screenshot('app_permissions')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_do_not_track()
        self.take_screenshot('do_not_track')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_browsing_privacy()
        self.take_screenshot('browsing_privacy')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_media_storage()
        self.take_screenshot('media_storage')
        settings.return_to_prev_menu(settings.screen_element)

        settings.open_application_storage()
        self.take_screenshot('application_storage')
        settings.return_to_prev_menu(settings.screen_element)

        ### Device Information and its sub pages
        device_info_page = settings.open_device_info()
        self.take_screenshot('dev_info')
        GaiaImageCompareTestCase.scroll(self.marionette, 'down', device_info_page.screen_element.size['height'],
                                        screen=device_info_page.screen_element)
        self.take_screenshot('dev_info')

        moreinfo_page = device_info_page.tap_more_info()
        self.take_screenshot('dev_info-more_info')
        GaiaImageCompareTestCase.scroll(self.marionette, 'down', device_info_page.screen_element.size['height'],
                                        screen=moreinfo_page.screen)
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
