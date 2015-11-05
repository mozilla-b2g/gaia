# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.form_controls.binarycontrol import GaiaBinaryControl
from gaiatest.apps.base import Base


class CallSettings(Base):

    _page_locator = (By.ID, 'call-iccs')
    _sim_1_locator = (By.ID, 'menuItem-call-sim1')

    _call_settings_page_locator = (By.ID, 'call')
    _voicemail_locator = (By.CSS_SELECTOR, '.menuItem-voicemail')
    _voicemail_number_locator = (By.CLASS_NAME, 'vm-number')
    _voicemail_page_locator = (By.ID, 'call-voiceMailSettings')

    _caller_id_menu_item_locator = (By.ID, 'menuItem-callerId')
    _caller_id_selector_locator = (By.ID, 'ril-callerId')
    _caller_id_confirm_button_locator = (By.CLASS_NAME, 'value-option-confirm')

    _fixed_dialing_page_locator = (By.ID, 'call-fdnSettings')
    _fixed_dialing_numbers_locator = (By.ID, 'menuItem-callFdn')
    _toggle_fixed_dialing_number_locator = (By.CSS_SELECTOR, '.fdn-enabled gaia-switch')
    _sim_pin_page_locator = (By.ID, 'simpin-dialog')
    _sim_pin_area_locator = (By.CLASS_NAME, 'sim-code-area')
    _auth_number_locator = (By.CSS_SELECTOR, '[data-l10n-id = "fdn-authorizedNumbers"]')
    _auth_number_page_locator = (By.ID, 'call-fdnList')

    _call_forwarding_page_locator = (By.ID, 'call-forwarding')
    _call_forwarding_locator = (By.ID, 'menuItem-callForwarding')
    _call_forwarding_status_disabled_text_locator = \
        (By.CSS_SELECTOR, '[data-l10n-id = "callForwardingNotForwarding"]')
    _call_forwarding_always_locator = (By.ID, 'li-cfu-desc')
    _call_forwarding_always_page_locator = (By.ID, 'call-cf-unconditional-settings')
    _call_forwarding_busy_locator = (By.ID, 'li-cfmb-desc')
    _call_forwarding_busy_page_locator = (By.ID, 'call-cf-mobile-busy-settings')
    _call_forwarding_unanswered_locator = (By.ID, 'li-cfnrep-desc')
    _call_forwarding_unanswered_page_locator = (By.ID, 'call-cf-no-reply-settings')
    _call_forwarding_unreachable_locator = (By.ID, 'li-cfnrea-desc')
    _call_forwarding_unreachable_page_locator = (By.ID, 'call-cf-not-reachable-settings')

    _call_barring_page_locator = (By.ID, 'call-cbSettings')
    _call_barring_back_btn_locator = (By.CSS_SELECTOR, '[data-l10n-id = "back"]')
    _call_barring_locator = (By.ID, 'menuItem-callBarring')
    _call_barring_status_text_locator = (By.ID, 'baoc-desc')
    _call_barring_all_switch_locator = (By.ID, 'li-cb-baoc')
    _call_barring_all_cancel_button_locator = (By.ID, 'cb-passcode-cancel-btn')
    _change_passcode_locator = (By.ID, 'li-cb-pswd')
    _passcode_page_locator = (By.ID, 'call-barring-passcode-change')

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    @property
    def cs_screen_element(self):
        return self.marionette.find_element(*self._call_settings_page_locator)

    @property
    def vm_screen_element(self):
        return self.marionette.find_element(*self._voicemail_page_locator)

    @property
    def fixed_dialing_screen_element(self):
        return self.marionette.find_element(*self._fixed_dialing_page_locator)

    @property
    def fixed_dialing_simpin_screen_element(self):
        return self.marionette.find_element(*self._sim_pin_page_locator)

    @property
    def auth_screen_element(self):
        return self.marionette.find_element(*self._auth_number_page_locator)

    @property
    def call_forwarding_screen_element(self):
        return self.marionette.find_element(*self._call_forwarding_page_locator)

    @property
    def call_forwarding_always_screen_element(self):
        return self.marionette.find_element(*self._call_forwarding_always_page_locator)

    @property
    def call_forwarding_busy_screen_element(self):
        return self.marionette.find_element(*self._call_forwarding_busy_page_locator)

    @property
    def call_forwarding_unans_screen_element(self):
        return self.marionette.find_element(*self._call_forwarding_unanswered_page_locator)

    @property
    def call_forwarding_unreach_screen_element(self):
        return self.marionette.find_element(*self._call_forwarding_unreachable_page_locator)

    @property
    def call_barring_screen_element(self):
        return self.marionette.find_element(*self._call_barring_page_locator)

    @property
    def call_barring_back_btn_element(self):
        return self.marionette.find_element(*self._call_barring_back_btn_locator)

    @property
    def call_barring_passcode_screen_element(self):
        return self.marionette.find_element(*self._passcode_page_locator)

    def tap_sim_1(self):
        element = self.marionette.find_element(*self._sim_1_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and
                                    expected.element_enabled(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(
            *self._call_settings_page_locator))

    def tap_voicemail(self):
        element = self.marionette.find_element(*self._voicemail_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and
                                    expected.element_enabled(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(
            *self._voicemail_number_locator))
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(lambda m: self.keyboard.is_keyboard_displayed)
        self.apps.switch_to_displayed_app()

    def tap_caller_id_selection(self):
        menu_item = self.marionette.find_element(*self._caller_id_menu_item_locator)
        Wait(self.marionette).until(lambda m: not menu_item.get_attribute('aria-disabled'))

        element = self.marionette.find_element(*self._caller_id_selector_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and
                                    expected.element_enabled(element))
        element.tap()
        self.marionette.switch_to_frame()

    def confirm_caller_id_selection(self):
        element = self.marionette.find_element(*self._caller_id_confirm_button_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and
                                    expected.element_enabled(element))
        element.tap()
        self.apps.switch_to_displayed_app()
        Wait(self.marionette).until(expected.element_displayed(*self._caller_id_selector_locator))

    def tap_fixed_dialing(self):
        element = self.marionette.find_element(*self._fixed_dialing_numbers_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and
                                    expected.element_enabled(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(
            *self._fixed_dialing_page_locator))

    def enable_fixed_dialing(self):
        GaiaBinaryControl(self.marionette, self._toggle_fixed_dialing_number_locator).enable()

        Wait(self.marionette).until(expected.element_displayed(
            *self._sim_pin_area_locator))
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(lambda m: self.keyboard.is_keyboard_displayed)
        self.apps.switch_to_displayed_app()

    def tap_auth_numbers(self):
        element = self.marionette.find_element(*self._auth_number_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and
                                    expected.element_enabled(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(
            *self._auth_number_page_locator))

    def tap_call_forwarding(self):
        element = self.marionette.find_element(*self._call_forwarding_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and
                                    expected.element_enabled(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(
            *self._call_forwarding_page_locator))

    # the default is 'disabled'
    def wait_until_call_forwarding_info_received(self):
        Wait(self.marionette, timeout=60).until(
            expected.element_displayed(*self._call_forwarding_status_disabled_text_locator))

    def tap_always_forward(self):
        element = self.marionette.find_element(*self._call_forwarding_always_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and
                                    expected.element_enabled(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(
            *self._call_forwarding_always_page_locator))
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(lambda m: self.keyboard.is_keyboard_displayed)
        self.apps.switch_to_displayed_app()

    def tap_forward_when_busy(self):
        element = self.marionette.find_element(*self._call_forwarding_busy_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and
                                    expected.element_enabled(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(
            *self._call_forwarding_busy_page_locator))
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(lambda m: self.keyboard.is_keyboard_displayed)
        self.apps.switch_to_displayed_app()

    def tap_forward_unanswered(self):
        element = self.marionette.find_element(*self._call_forwarding_unanswered_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and
                                    expected.element_enabled(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(
            *self._call_forwarding_unanswered_page_locator))
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(lambda m: self.keyboard.is_keyboard_displayed)
        self.apps.switch_to_displayed_app()

    def tap_forward_unreachable(self):
        element = self.marionette.find_element(*self._call_forwarding_unreachable_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and
                                    expected.element_enabled(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(
            *self._call_forwarding_unreachable_page_locator))
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(lambda m: self.keyboard.is_keyboard_displayed)
        self.apps.switch_to_displayed_app()

    def tap_call_barring(self):
        element = self.marionette.find_element(*self._call_barring_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and
                                    expected.element_enabled(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._call_barring_page_locator))

    def wait_until_call_barring_info_received(self):
        status = self.marionette.find_element(*self._call_barring_status_text_locator)
        Wait(self.marionette, timeout=60).until(
            lambda m: status.get_attribute('data-l10n-id') == 'disabled')

    def tap_call_barring_all(self):
        element = self.marionette.find_element(*self._call_barring_all_switch_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and
                                    expected.element_enabled(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(
            *self._call_barring_all_cancel_button_locator))
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(lambda m: self.keyboard.is_keyboard_displayed)
        self.apps.switch_to_displayed_app()

    def tap_call_barring_all_cancel(self):
        element = self.marionette.find_element(*self._call_barring_all_cancel_button_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and
                                    expected.element_enabled(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._call_barring_page_locator))

    def tap_change_passcode(self):
        element = self.marionette.find_element(*self._change_passcode_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and
                                    expected.element_enabled(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._passcode_page_locator))
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(lambda m: self.keyboard.is_keyboard_displayed)
        self.apps.switch_to_displayed_app()
