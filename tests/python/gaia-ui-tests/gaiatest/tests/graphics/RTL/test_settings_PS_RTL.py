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
        self.take_screenshot('app_permissions-geoloc_option')
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
        browsingprivacy_page.tap_clear_browsing_history()
        self.take_screenshot('browsing_privacy-history')
        browsingprivacy_page.cancel_clear()
        browsingprivacy_page.tap_clear_private_data()
        self.take_screenshot('browsing_privacy-data')
        browsingprivacy_page.cancel_clear()
        settings.return_to_prev_menu(settings.screen_element, browsingprivacy_page.screen_element)

        # Note: this does not check the initial guided tour
        ################# Privacy Controls ######################
        privacycontrol_page = settings.open_privacy_controls()
        self.apps.switch_to_displayed_app()
        privacycontrol_page.tap_close_tour()
        self.take_screenshot('privacy_control')
        privacycontrol_page.tap_about()
        self.take_screenshot('privacy_control-about')
        settings.return_to_prev_menu(privacycontrol_page.screen_element, privacycontrol_page.about_screen_element)
        #privacycontrol_page.exit_about()

        ################# Location Accuracy
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
        settings.return_to_prev_menu(loc_acc_page.applist_screen_element, loc_acc_page.appview_screen_element)
        settings.return_to_prev_menu(loc_acc_page.screen_element, loc_acc_page.applist_screen_element)
        settings.return_to_prev_menu(privacycontrol_page.screen_element, loc_acc_page.screen_element)

        ################# Remote Protect #################
        rprotect_page = privacycontrol_page.tap_remote_protect()
        self.take_screenshot('privacy_control-remprotect')
        settings.return_to_prev_menu(privacycontrol_page.screen_element, rprotect_page.screen_element)

        # Note: Only the first app and first permission details are opened for format check
        ################# Transparency Controls #################
        transpc_page = privacycontrol_page.tap_trans_control()
        self.take_screenshot('privacy_control-trans_ctrl')
        transpc_page.tap_applications()
        self.take_screenshot('privacy_control-trans_ctrl_apps')
        transpc_page.tap_app_order_selection()
        self.take_screenshot('privacy_control-trans_ctrl_apps_order_select')
        transpc_page.tap_app_order_ok()
        #tap first app
        transpc_page.tap_first_app_in_list()
        self.take_screenshot('privacy_control-trans_ctrl_first_app')
        settings.return_to_prev_menu(transpc_page.apps_screen_element,
                                     transpc_page.apps_detail_element,
                                     transpc_page.app_detail_back_btn)
        settings.return_to_prev_menu(transpc_page.screen_element,
                                     transpc_page.apps_screen_element,
                                     transpc_page.app_list_back_btn)
        transpc_page.tap_permissions()

        self.take_screenshot('privacy_control-transp-perm')
        for i in range(0, 5):
            GaiaImageCompareTestCase.scroll(self.marionette, 'down',
                                            settings.screen_element.size['height'],
                                            screen=transpc_page.perm_screen_element)
            self.take_screenshot('privacy_control-transp-perm')
        transpc_page.tap_first_perm_in_list()
        self.take_screenshot('privacy_control-trans_ctrl_first_perm')
        settings.return_to_prev_menu(transpc_page.perm_screen_element, transpc_page.perm_detail_element)
