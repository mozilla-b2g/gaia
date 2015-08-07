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

        #################### Sound ######################
        sound_page = settings.open_sound()
        self.take_screenshot('sound')
        GaiaImageCompareTestCase.scroll(self.marionette, 'down', sound_page.screen_element.size['height'],
                                        screen=sound_page.screen_element)
        self.take_screenshot('sound')
        ringtone_page = sound_page.tap_ring_tone_selector()

        self.take_screenshot('sound-ringtones')
        for i in range(0, 5):
            GaiaImageCompareTestCase.scroll(self.marionette, 'down', ringtone_page.screen_element.size['height'],
                                            screen = ringtone_page.screen_element)
            self.take_screenshot('sound-ringtones')

        ringtone_page.tap_exit()
        settings.switch_to_settings_app()
        Wait(self.marionette).until(lambda m: sound_page.ring_tone_selector_visible)

        alerts_page = sound_page.tap_alerts_selector()
        self.take_screenshot('sound-alerts')
        for i in range(0, 5):
            GaiaImageCompareTestCase.scroll(self.marionette, 'down', alerts_page.screen_element.size['height'],
                                            screen=alerts_page.screen_element)
            self.take_screenshot('sound-alerts')
        alerts_page.tap_exit()
        settings.switch_to_settings_app()
        Wait(self.marionette).until(lambda m: sound_page.ring_tone_selector_visible)

        manage_page = sound_page.tap_manage_tones_selector()
        self.take_screenshot('sound-manage_tones')
        for i in range(0, 5):
            GaiaImageCompareTestCase.scroll(self.marionette, 'down', manage_page.screen_element.size['height'],
                                            screen=manage_page.screen_element)
            self.take_screenshot('sound-manage_tones')

        manage_page.ring_tones[1].select_option()
        self.take_screenshot('sound-manage_tones-share')
        manage_page.cancel_share()
        manage_page.tap_exit()
        settings.switch_to_settings_app()
        Wait(self.marionette).until(lambda m: sound_page.ring_tone_selector_visible)
        settings.return_to_prev_menu(settings.screen_element)

        #################### Display ######################
        display_page = settings.open_display()
        self.take_screenshot('display')
        display_page.pick_wallpaper()
        self.take_screenshot('display-wallpaper_pick')
        display_page.cancel_pick_wallpaper()
        display_page.tap_timeout_selector()
        self.take_screenshot('display-timeout_values')
        display_page.tap_timeout_confirmation()
        settings.return_to_prev_menu(settings.screen_element)

        #################### Homescreen ######################
        homescreen_page = settings.open_homescreen()
        self.take_screenshot('homescreen')
        homescreen_page.open_select_icon_layout()
        self.take_screenshot('homescreen-layout')
        homescreen_page.open_select_icon_layout()
        settings.return_to_prev_menu(settings.screen_element)

        ################### Search ######################
        search_page = settings.open_search()
        self.take_screenshot('search')
        search_page.open_select_search_engine()
        self.take_screenshot('search-engine_list')
        search_page.close_select_search_engine()
        settings.return_to_prev_menu(settings.screen_element)

        ################## Search ######################
        settings.open_navigation()
        self.take_screenshot('navigation')
        settings.return_to_prev_menu(settings.screen_element)

        ################# Notifications ######################
        settings.open_notification()
        self.take_screenshot('notification')
        settings.return_to_prev_menu(settings.screen_element)

        ################ Notifications ######################
        # Only the main page and Time Format selection is checked
        date_time_page = settings.open_date_and_time()
        self.take_screenshot('date_and_time')
        GaiaImageCompareTestCase.scroll(self.marionette, 'down', date_time_page.screen_element.size['height'],
                                        screen=date_time_page.screen_element)
        self.take_screenshot('date_and_time')
        date_time_page.open_time_format()
        self.take_screenshot('date_and_time-time_format')
        date_time_page.close_time_format()
        settings.return_to_prev_menu(settings.screen_element)

        ############### Language ######################
        # 'Get more languages' menu cannot be opened due to css bug
        language_page = settings.open_language()
        self.take_screenshot('language')
        language_page.open_select_language()
        self.take_screenshot('language-select')
        language_page.close_select_language()
        settings.return_to_prev_menu(settings.screen_element)

        ############### Keyboards ######################
        keyboard_page = settings.open_keyboard()
        self.take_screenshot('keyboard')
        builtin_page = keyboard_page.tap_built_in_keyboards()
        self.take_screenshot('keyboard-built_in')
        builtin_page.tap_user_dictionary()
        self.take_screenshot('keyboard-user-dict')
        builtin_page.tap_user_dict_exit()
        builtin_page.tap_exit()
        keyboard_page.wait_until_page_ready()
        keyboard_page.tap_add_more_keyboards()
        self.take_screenshot('keyboard-more_kb')
        settings.return_to_prev_menu(keyboard_page.screen_element)
        settings.return_to_prev_menu(settings.screen_element)

        ############## Themes ######################
        settings.open_themes()
        self.take_screenshot('themes')
        settings.return_to_prev_menu(settings.screen_element, gaia_header=False)

        ############# Addons ######################
        addons_page = settings.open_addons()
        self.take_screenshot('addons')
        addons_page.tap_first_item()
        self.take_screenshot('addons-addon')
        addons_page.toggle_addon_status()  # addons are disabled by default
        self.take_screenshot('addons-addon')
        addons_page.toggle_addon_status()
        addons_page.exit_addon_description()
        settings.return_to_prev_menu(settings.screen_element)

        ############# Achievements ######################
        settings.open_achievements()
        self.take_screenshot('achievements')
        settings.return_to_prev_menu(settings.screen_element)
