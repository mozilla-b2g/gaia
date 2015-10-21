# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsRTLPS(GaiaImageCompareTestCase):

    # Note: Guided Tour is not covered
    def test_settings_app(self):

        settings = Settings(self.marionette)
        settings.launch()

        ################## Screen Lock ######################
        screenlock_view = settings.open_screen_lock()
        screenlock_view.enable_lockscreen()
        self.take_screenshot('screen_lock')
        screenlock_view.enable_passcode_lock()
        self.take_screenshot('screen_lock-passcode')
        settings.return_to_prev_menu(screenlock_view.screen_element)
        settings.return_to_prev_menu(settings.screen_element)

        ################## App Permission ######################
        permission_view = settings.open_app_permissions()
        self.take_screenshot('app_permissions')
        permission_view.tap_first_item()
        self.take_screenshot('app_permissions-app_list')
        permission_view.tap_geolocation_selection()
        self.take_screenshot('app_permissions-geoloc_option')
        permission_view.exit_geolocation_selection()
        settings.return_to_prev_menu(permission_view.screen_element)
        settings.return_to_prev_menu(settings.screen_element)

        ################## Do Not Track ######################
        dnt_page = settings.open_do_not_track()
        self.take_screenshot('do_not_track')
        GaiaImageCompareTestCase.scroll(self.marionette, 'down',
                                        settings.screen_element.size['height'], screen = dnt_page.screen_element)
        self.take_screenshot('do_not_track')
        settings.return_to_prev_menu(settings.screen_element)

        ################## Browsing Privacy ######################
        browsingprivacy_page = settings.open_browsing_privacy()
        self.take_screenshot('browsing_privacy')
        browsingprivacy_page.tap_clear_browsing_history()
        self.take_screenshot('browsing_privacy-history')
        browsingprivacy_page.cancel_clear()
        browsingprivacy_page.tap_clear_private_data()
        self.take_screenshot('browsing_privacy-data')
        browsingprivacy_page.cancel_clear()
        settings.return_to_prev_menu(settings.screen_element)

        ################# Privacy Controls ######################
        privacycontrol_page = settings.open_privacy_controls()
        self.apps.switch_to_displayed_app()
        privacycontrol_page.tap_close_tour()
        self.take_screenshot('privacy_control')
        privacycontrol_page.tap_about()
        self.take_screenshot('privacy_control-about')
        privacycontrol_page.exit_about()

        #### Location Accuracy
        # Note: Checking only the first app in the app list
        loc_acc_page = privacycontrol_page.tap_loc_accuracy()
        loc_acc_page.switch_loc_adjustment()
        self.take_screenshot('privacy_control-locacc')
        loc_acc_page.tap_adjustment_selection()
        self.take_screenshot('privacy_control-locacc-adjust_selection')
        loc_acc_page.tap_adjustment_ok()
        loc_acc_page.tap_add_exception()
        self.take_screenshot('privacy_control-locacc-applist')
        loc_acc_page.tap_first_app()
        self.take_screenshot('privacy_control-locacc-applist-firstapp')
        loc_acc_page.tap_global_settings()
        self.take_screenshot('privacy_control-locacc-applist-globalsetting')
        loc_acc_page.tap_global_settings_ok()
        settings.return_to_prev_menu(loc_acc_page.applist_screen_element)
        settings.return_to_prev_menu(loc_acc_page.screen_element)
        settings.return_to_prev_menu(privacycontrol_page.screen_element)

        #### Remote Protect
        privacycontrol_page.tap_remote_protect()
        self.take_screenshot('privacy_control-remprotect')
        settings.return_to_prev_menu(privacycontrol_page.screen_element)

        #### Transparency Controls
        #### Note: Only the first app and first permission details are opened for format check
        transpc_view = privacycontrol_page.tap_trans_control()
        self.take_screenshot('privacy_control-trans_ctrl')
        transpc_view.tap_applications()
        self.take_screenshot('privacy_control-trans_ctrl_apps')
        transpc_view.tap_app_order_selection()
        self.take_screenshot('privacy_control-trans_ctrl_apps_order_select')
        transpc_view.tap_app_order_ok()
        #tap first app
        transpc_view.tap_first_app_in_list()
        self.take_screenshot('privacy_control-trans_ctrl_first_app')
        settings.return_to_prev_menu(transpc_view.apps_screen_element, False)
        settings.return_to_prev_menu(transpc_view.screen_element, False)
        transpc_view.tap_permissions()

        self.take_screenshot('privacy_control-transp-perm')
        for i in range(0, 5):
            GaiaImageCompareTestCase.scroll(self.marionette, 'down',
                                            settings.screen_element.size['height'],
                                            screen=transpc_view.perm_screen_element)
            self.take_screenshot('privacy_control-transp-perm')
        transpc_view.tap_first_perm_in_list()
        self.take_screenshot('privacy_control-trans_ctrl_first_perm')
        settings.return_to_prev_menu(transpc_view.perm_screen_element)
