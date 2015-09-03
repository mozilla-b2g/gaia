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

        # opening each subpage in Settings menu.
        # some subpages have their own subpages, and they need to be opened as well.
        ##################### Wi-Fi and its subpages ######################
        wifi_page = settings.open_wifi()
        Wait(self.marionette).until(lambda m: wifi_page.is_wifi_enabled is True)
        
        self.take_screenshot('wifi-enabled')
        wifi_page.tap_connect_with_wps()
        self.take_screenshot('wifi-wps')
        settings.return_to_prev_menu(wifi_page.screen_element, wifi_page.wps_screen_element)
        self.marionette.execute_script('arguments[0].scrollIntoView(false);', [wifi_page.manage_network_button])
        wifi_page.tap_manage_networks()
        wifi_page.tap_join_hidden_network()
        wifi_page.tap_security_selector()
        self.take_screenshot('wifi-securityType')
        wifi_page.tap_security_ok()
        self.take_screenshot('wifi-joinHidden')
        settings.return_to_prev_menu(wifi_page.manage_network_screen_element, 
                                     wifi_page.join_hidden_network_screen_element)
        self.take_screenshot('wifi-manageNetwork')
        settings.return_to_prev_menu(wifi_page.screen_element, wifi_page.manage_network_screen_element)
        wifi_page.tap_manage_certs()
        wifi_page.tap_import_certs()
        self.take_screenshot('wifi-importCert')
        settings.return_to_prev_menu(wifi_page.manage_certs_screen_element, wifi_page.select_certs_screen_element)
        self.take_screenshot('wifi-manageCert')
        settings.return_to_prev_menu(wifi_page.screen_element, wifi_page.manage_certs_screen_element)
        wifi_page.disable_wifi()
        self.take_screenshot('wifi-disabled')
        settings.return_to_prev_menu(settings.screen_element, wifi_page.screen_element)

        #################### Sim manager and its subpages ######################
        sim_page = settings.open_sim_manager()
        self.take_screenshot('sim_manager')
        GaiaImageCompareTestCase.scroll(self.marionette, 'down', sim_page.screen_element.size['height'],
                                        screen=sim_page.screen_element)
        self.take_screenshot('sim_manager')     
        sim_page.tap_sim_security()
        sim_page.enable_sim_pin()
        self.take_screenshot('sim_manager-pin_page')
        settings.return_to_prev_menu(sim_page.security_screen_element, sim_page.sim_pin_screen_element)
        self.take_screenshot('sim_manager-security')
        settings.return_to_prev_menu(sim_page.screen_element, sim_page.security_screen_element)
        settings.return_to_prev_menu(settings.screen_element, sim_page.screen_element)

        ################### Call Settings and its subpages ######################
        cs_page = settings.open_call()
        self.take_screenshot('cs-selectSIM')
        cs_page.tap_sim_1()
        self.take_screenshot('callsettings')
        cs_page.tap_voicemail()
        self.take_screenshot('voicemail')
        settings.return_to_prev_menu(cs_page.cs_screen_element, cs_page.vm_screen_element)

        cs_page.tap_caller_id_selection()
        self.take_screenshot('callerID')
        cs_page.confirm_caller_id_selection()

        cs_page.tap_fixed_dialing()
        self.take_screenshot('fixeddialing')
        cs_page.tap_auth_numbers()
        self.take_screenshot('authNumbers')
        settings.return_to_prev_menu(cs_page.fd_screen_element, cs_page.auth_screen_element)
        cs_page.enable_fixed_dialing()
        self.take_screenshot('enableFDN')
        settings.return_to_prev_menu(cs_page.fd_screen_element, cs_page.fd_simpin_screen_element)
        settings.return_to_prev_menu(cs_page.cs_screen_element, cs_page.fd_screen_element)

        cs_page.tap_call_forwarding()
        self.take_screenshot('callforward_init')
        cs_page.wait_until_cf_info_received()
        self.take_screenshot('callforward')
        cs_page.tap_always_forward()
        self.take_screenshot('alwaysFwd')
        settings.return_to_prev_menu(cs_page.cf_screen_element, cs_page.cf_always_screen_element)
        cs_page.tap_forward_when_busy()
        self.take_screenshot('busyFwd')
        settings.return_to_prev_menu(cs_page.cf_screen_element, cs_page.cf_busy_screen_element)
        cs_page.tap_forward_unanswered()
        self.take_screenshot('unansweredFwd')
        settings.return_to_prev_menu(cs_page.cf_screen_element, cs_page.cf_unans_screen_element)
        cs_page.tap_forward_unreachable()
        self.take_screenshot('unreachFwd')
        settings.return_to_prev_menu(cs_page.cf_screen_element, cs_page.cf_unreach_screen_element)
        settings.return_to_prev_menu(cs_page.cs_screen_element, cs_page.cf_screen_element)

        cs_page.tap_call_barring()
        self.take_screenshot('callBarring-init')
        cs_page.wait_until_cb_info_received()
        self.take_screenshot('callBarring')
        cs_page.tap_change_passcode()
        self.take_screenshot('callBarring-passcode')
        settings.return_to_prev_menu(cs_page.cb_screen_element, cs_page.cb_passcode_screen_element)
        cs_page.tap_cb_all()
        self.take_screenshot('callBarring-passcode2')
        cs_page.tap_cb_all_cancel()
        settings.return_to_prev_menu(cs_page.cs_screen_element, cs_page.cb_screen_element, gaia_header=False)
        settings.return_to_prev_menu(cs_page.screen_element, cs_page.cs_screen_element)
        settings.return_to_prev_menu(settings.screen_element, cs_page.screen_element)

        ################## Messaging Settings and its subpages ######################
        messaging_page = settings.open_message()
        self.take_screenshot('message')
        GaiaImageCompareTestCase.scroll(self.marionette, 'down', messaging_page.screen_element.size['height'],
                                        screen=messaging_page.screen_element)
        self.take_screenshot('message')
        messaging_page.tap_auto_retrieve_selector()
        self.take_screenshot('message-autoretrieve_options')
        messaging_page.close_retrieve_dialog()
        messaging_page.select_sim_1()
        self.take_screenshot('message-sim_1')
        settings.return_to_prev_menu(messaging_page.screen_element,messaging_page.settings_screen_element)
        settings.return_to_prev_menu(settings.screen_element,messaging_page.screen_element)

        ################### Cellular & Data and its subpages ######################
        cell_data_page = settings.open_cell_and_data()
        self.take_screenshot('cell_and_data')
        cell_data_page.enable_data()
        self.take_screenshot('data_enable_prompt')
        cell_data_page.tap_ok_on_prompt()
        Wait(self.marionette).until(lambda m: cell_data_page.is_data_toggle_checked is True)
        cell_data_page.enable_roaming()
        self.take_screenshot('roaming_enable_prompt')
        cell_data_page.tap_ok_on_prompt()
        Wait(self.marionette).until(lambda m: cell_data_page.is_roaming_toggle_checked is True)
        self.take_screenshot('cell_and_data_enabled')
        sim_settings_page = cell_data_page.tap_sim_1_setting()
        self.take_screenshot('sim_1_setting')
        sim_settings_page.tap_network_operator()
        self.take_screenshot('network_op')
        sim_settings_page.tap_network_type()
        self.take_screenshot('cell_network_type')
        sim_settings_page.confirm_network_type()
        settings.return_to_prev_menu(sim_settings_page.screen_element, sim_settings_page.network_op_screen_element)
        sim_settings_page.tap_apn_settings()
        self.take_screenshot('apn_settings')
        sim_settings_page.tap_reset_to_default()
        self.take_screenshot('apn_setting_reset')
        sim_settings_page.tap_cancel_reset()
        sim_settings_page.tap_data_settings()
        self.take_screenshot('apn_list') # all other settings show the same dialog
        sim_settings_page.tap_add_new_apn()
        self.take_screenshot('apn_editor')
        for i in range(0, 2):
            GaiaImageCompareTestCase.scroll(self.marionette, 'down',
                                            sim_settings_page.apn_editor_screen_element.size['height'],
                                            screen=sim_settings_page.apn_editor_screen_element)
            self.take_screenshot('apn_editor')
        sim_settings_page.select_authentication()
        self.take_screenshot('apn_authentication')
        sim_settings_page.confirm_apn_selection()
        sim_settings_page.select_protocol()
        self.take_screenshot('apn_protocol')
        sim_settings_page.confirm_apn_selection()
        sim_settings_page.select_roaming_protocol()
        self.take_screenshot('apn_roaming')
        sim_settings_page.confirm_apn_selection()

        settings.return_to_prev_menu(sim_settings_page.data_settings_screen_element,
                                     sim_settings_page.apn_editor_screen_element)
        settings.return_to_prev_menu(sim_settings_page.apn_settings_screen_element,
                                     sim_settings_page.data_settings_screen_element)
        settings.return_to_prev_menu(sim_settings_page.screen_element,
                                     sim_settings_page.apn_settings_screen_element)
        settings.return_to_prev_menu(cell_data_page.screen_element, sim_settings_page.screen_element)
        settings.return_to_prev_menu(settings.screen_element, cell_data_page.screen_element)

        ################# Bluetooth and its subpages ######################
        bluetooth_page = settings.open_bluetooth()
        self.take_screenshot('bluetooth-disabled')
        bluetooth_page.enable_bluetooth()
        self.take_screenshot('bluetooth-enabled')
        bluetooth_page.tap_rename_my_device()
        bluetooth_page.type_phone_name("RTL_Testing")
        self.take_screenshot('bluetooth-renameDevice')
        bluetooth_page.tap_update_device_name_ok()
        bluetooth_page.disable_bluetooth()
        settings.return_to_prev_menu(settings.screen_element, bluetooth_page.screen_element)

        ##################### Internet sharing and its subpages ######################
        internet_settings_page = settings.open_internet_sharing()
        self.take_screenshot('internet_sharing')
        GaiaImageCompareTestCase.scroll(self.marionette, 'down', internet_settings_page.screen_element.size['height'],
                                        screen=internet_settings_page.screen_element)

        self.take_screenshot('internet_sharing')
        hotspot_page = internet_settings_page.tap_hotspot_settings()
        self.take_screenshot('internet_sharing-hotspot')
        hotspot_page.tap_security_settings()
        self.take_screenshot('internet_sharing-hotspot-security')
        hotspot_page.confirm_security_settings()
        settings.return_to_prev_menu(internet_settings_page.screen_element, hotspot_page.screen_element)
        settings.return_to_prev_menu(settings.screen_element, internet_settings_page.screen_element)
