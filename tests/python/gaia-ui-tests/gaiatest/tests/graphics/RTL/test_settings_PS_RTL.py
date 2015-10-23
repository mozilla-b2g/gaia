# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsRTLPS(GaiaImageCompareTestCase):

    def test_settings_app(self):

        settings = Settings(self.marionette)
        settings.launch()

        ################## Screen Lock ######################
        screenlock_page = settings.open_screen_lock()
        screenlock_page.enable_lockscreen()
        self.take_screenshot('screen_lock')
        screenlock_page.enable_passcode_lock()
        self.take_screenshot('screen_lock-passcode')
        settings.return_to_prev_menu(screenlock_page.screen_element, screenlock_page.passcode_screen_element)
        settings.return_to_prev_menu(settings.screen_element, screenlock_page.screen_element)

        ################## App Permission ######################
        permission_page = settings.open_app_permissions()
        self.take_screenshot('app_permissions')
        permission_page.tap_camera_app()
        self.take_screenshot('app_permissions-app_list')
        permission_page.tap_geolocation_selection()
        self.take_screenshot('app_permissions-geoloc_option',top_frame=True)
        permission_page.exit_geolocation_selection()
        settings.return_to_prev_menu(permission_page.screen_element, permission_page.details_screen_element)
        settings.return_to_prev_menu(settings.screen_element, permission_page.screen_element)

        ################## Do Not Track ######################
        dnt_page = settings.open_do_not_track()
        self.take_screenshot('do_not_track')
        GaiaImageCompareTestCase.scroll(self.marionette, 'down',
                                        settings.screen_element.size['height'], screen = dnt_page.screen_element)
        self.take_screenshot('do_not_track')
        settings.return_to_prev_menu(settings.screen_element, dnt_page.screen_element)

        ################## Browsing Privacy ######################
        browsingprivacy_page = settings.open_browsing_privacy()
        self.take_screenshot('browsing_privacy')
        confirm_dialog = browsingprivacy_page.clear_browsing_history()
        self.take_screenshot('browsing_privacy-history')
        confirm_dialog.cancel_clear()
        confirm_dialog = confirm_dialog.clear_private_data()
        self.take_screenshot('browsing_privacy-data')
        confirm_dialog.cancel_clear()
        settings.return_to_prev_menu(settings.screen_element, browsingprivacy_page.screen_element)
