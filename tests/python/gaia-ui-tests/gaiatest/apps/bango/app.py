# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
import re
from marionette.keys import Keys
from gaiatest.apps.base import Base


class Bango(Base):

    _payment_frame_locator = ('css selector', "div#trustedui-frame-container > iframe")

    # id_pin is the 4 digit security code to secure your identity
    # sms_pin is the PIN received in SMS to validate the network connection

    # Enter/confirm PIN
    _enter_id_pin_locator = ('id', 'enter-pin')
    _enter_id_pin_input_locator = ('css selector', 'div.pinbox span')
    _enter_id_pin_section_locator = ('css selector', 'form[action="/mozpay/pin/create"]')
    _confirm_id_pin_section_locator = ('css selector', 'form[action="/mozpay/pin/confirm"]')
    _confirm_id_pin_continue_button_locator = ('css selector', '#pin > footer > button')

    # Enter mobile network/number/country locators
    _number_section_locator = ('id', 'numberSection')
    _number_section_label_locator = ('css selector', '#numberSection label')
    _mobile_number_locator = ('id', 'msisdn')
    _mobile_network_select_locator = ('id', 'contentHolder_uxContent_uxDdlNetworks')
    _country_region_flag_locator = ('id', 'contentHolder_uxContent_uxRegionSelection_uxImgRegionFlag')
    _change_country_link_locator = ('id', 'contentHolder_uxContent_uxRegionSelection_uxRegionChangeLnk')
    _country_select_list_locator = ('id', 'contentHolder_uxContent_uxRegionSelection_uxUlCountries')
    _mobile_section_continue_button_locator = ('id', 'contentHolder_uxContent_uxLnkContinue')

    # Pin received from SMS message
    _sms_pin_section_locator = ('id', 'pinSection')
    _sms_pin_section_label_locator = ('css selector', '#pinSection label')
    _sms_pin_input_locator = ('id', 'pin')
    _confirm_sms_pin_button_locator = ('id', 'contentHolder_uxContent_uxLnkConfirm')

    # Final buy app panel
    _buy_app_loading_locator = ('id', 'uxProcessingText')
    _buy_button_locator = ('id', 'uxBtnBuyNow')

    # System locators SMS toaster
    _notification_toaster_locator = ('id', 'notification-toaster')
    # System locator Select wrapper
    _select_locator = ("xpath", "//section[@id='value-selector-container']//li[label[span[text()='%s']]]")
    _close_button_locator = ('css selector', 'button.value-option-confirm')

    # Credit Card
    _card_number_locator = ('id', 'card_number')
    _card_expiry_locator = ('id', 'card_expiry')
    _card_cvv_locator = ('id', 'card_cvv')
    _card_remember_checkbox_locator = ('id', 'card_remember')

    # Fake payment
    _fake_payment_button_locator = ('css selector', 'section.pay p.centered')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.switch_to_bango_frame()

    def launch(self):
        self.switch_to_bango_frame()

    def switch_to_bango_frame(self):
        self.marionette.switch_to_frame()
        self.wait_for_element_present(*self._payment_frame_locator)
        payment_iframe = self.marionette.find_element(*self._payment_frame_locator)
        self.marionette.switch_to_frame(payment_iframe)

    def create_pin(self, pin):
        """
        A helper method to carry out the Bango PIN creation flow
        """

        # create pin workflow
        self.wait_for_enter_id_pin_section_displayed()

        # tap and enter the pin for the first time
        self.type_id_pin_number(pin)
        self.tap_confirm_id_pin_continue()
        self.wait_for_confirm_id_pin_section_displayed()

        # enter the pin code for the second time
        self.type_id_pin_number(pin)
        self.tap_confirm_id_pin_continue()

    def verify_phone_number(self, mobile_phone_number, country, network):
        """
        A helper method for phone number verification for Bango.
        """

        # wait for the phone number and network form
        self.wait_for_confirm_number_section_displayed()

        # If Bango does not successfully auto-detect the country
        if self.current_country != country:
            # Select the country first otherwise it clears the other fields
            self.tap_change_country()
            self.select_country(country)

        # Enter the phone number
        self.type_mobile_number(mobile_phone_number)

        # Choose the mobile network
        self.select_mobile_network(network)
        self.tap_mobile_section_continue_button()

        # Switch to System frame and wait for the SMS to arrive.
        self.marionette.switch_to_frame()
        notification_toaster = self.marionette.find_element(*self._notification_toaster_locator)

        # TODO Re-enable this when Bug 861874
        # self.wait_for_element_displayed(*self._notification_toaster_locator)
        self.wait_for_condition(lambda m: notification_toaster.location['y'] == 0,
                                timeout=300, message="SMS was not received before 300 second timeout")

        m = re.search("PIN: ([0-9]+).", notification_toaster.text)
        pin_number = m.group(1)

        self.switch_to_bango_frame()

        self.wait_for_sms_pin_section_displayed()

        # Enter the pin received in SMS
        self.type_sms_pin(pin_number)
        self.tap_confirm_sms_pin_button()

        self.marionette.switch_to_frame()
        self.switch_to_bango_frame()

    def pay_using_credit_card(self, card_number, expiry, cvv, save_card=False):
        self.wait_for_element_displayed(*self._card_number_locator)
        time.sleep(1)

        self.type_card_number(card_number)
        self.type_expiry(expiry)
        self.type_cvv(cvv)
        if save_card:
            self.select_save_card_details()

    def make_fake_payment(self):
        time.sleep(1)
        self.wait_for_element_displayed(*self._fake_payment_button_locator)
        self.marionette.find_element(*self._fake_payment_button_locator).tap()
        time.sleep(1)

    def wait_for_enter_id_pin_section_displayed(self):
        self.wait_for_element_displayed(*self._enter_id_pin_section_locator)
        time.sleep(2)

    def wait_for_confirm_id_pin_section_displayed(self):
        self.wait_for_element_displayed(*self._confirm_id_pin_section_locator)
        time.sleep(2)

    def wait_for_confirm_number_section_displayed(self):
        self.wait_for_element_displayed(*self._number_section_locator)
        time.sleep(2)

    def wait_for_sms_pin_section_displayed(self):
        self.wait_for_element_displayed(*self._sms_pin_section_locator)
        time.sleep(2)

    def wait_for_buy_app_section_displayed(self):
        self.wait_for_element_not_displayed(*self._buy_app_loading_locator)
        self.wait_for_element_displayed(*self._buy_button_locator)
        time.sleep(2)

    def type_id_pin_number(self, pin):
        self.marionette.find_element(*self._enter_id_pin_input_locator).tap()
        time.sleep(1)
        self.keyboard.send(pin)
        # Switch back to Bango frame
        self.switch_to_bango_frame()

    def tap_confirm_id_pin_continue(self):
        self.marionette.find_element(*self._confirm_id_pin_continue_button_locator).tap()
        time.sleep(1)

    @property
    def current_country(self):
        return self.marionette.find_element(*self._country_region_flag_locator).get_attribute('alt')

    def tap_change_country(self):
        self.marionette.find_element(*self._change_country_link_locator).tap()
        self.wait_for_element_displayed(*self._country_select_list_locator)
        time.sleep(1)

    def select_country(self, value):
        country_select = self.marionette.find_element('link text', value)
        country_select.tap()
        self.wait_for_element_not_displayed(*self._country_select_list_locator)
        time.sleep(1)

    def type_card_number(self, card_number):
        card_number_input = self.marionette.find_element(*self._card_number_locator)
        card_number_input.send_keys(card_number)
        card_number_input.send_keys(Keys.RETURN)
        time.sleep(1)

    def type_card_expiry(self, expiry):
        card_expiry_input = self.marionette.find_element(*self._card_expiry_locator)
        card_expiry_input.send_keys(expiry)
        card_expiry_input.send_keys(Keys.RETURN)
        time.sleep(1)

    def type_card_cvv(self, cvv):
        card_cvv_input = self.marionette.find_element(*self._card_cvv_locator)
        card_cvv_input.send_keys(cvv)
        card_cvv_input.send_keys(Keys.RETURN)
        time.sleep(1)

    def select_save_card_details(self):
        card_save_details_checkbox = self.marionette.find_element(*self._card_remember_checkbox_locator)
        card_save_details_checkbox.tap()
        time.sleep(1)

    def type_mobile_number(self, value):
        mobile_number_input = self.marionette.find_element(*self._mobile_number_locator)
        mobile_number_input.send_keys(value)
        mobile_number_input.send_keys(Keys.RETURN)
        time.sleep(1)
        self.marionette.find_element(*self._number_section_label_locator).tap()
        time.sleep(1)

    def select_mobile_network(self, network):
        # Compile the locator with string
        select_locator = (self._select_locator[0], self._select_locator[1] % network)

        mobile_network = self.marionette.find_element(*self._mobile_network_select_locator)
        mobile_network.tap()
        time.sleep(1)
        self.marionette.switch_to_frame()

        self.wait_for_element_present(*select_locator)

        # Tap the element of the locator we compiled above
        element = self.marionette.find_element(*select_locator)
        element.tap()
        time.sleep(1)
        # Wait for the option to become checked
        self.wait_for_condition(lambda m: m.find_element(*select_locator).get_attribute('aria-checked') == 'true')

        close_button = self.marionette.find_element(*self._close_button_locator)
        close_button.tap()
        time.sleep(1)
        # Wait for select box to close.
        self.wait_for_element_not_displayed(*self._close_button_locator)
        time.sleep(1)
        self.switch_to_bango_frame()

    def tap_mobile_section_continue_button(self):
        self.marionette.find_element(*self._mobile_section_continue_button_locator).tap()
        time.sleep(1)

    def type_sms_pin(self, sms_pin_number):
        pin_input = self.marionette.find_element(*self._sms_pin_input_locator)
        pin_input.tap()
        time.sleep(1)
        pin_input.send_keys(sms_pin_number)
        pin_input.send_keys(Keys.RETURN)

        time.sleep(1)
        self.marionette.find_element(*self._sms_pin_section_label_locator).tap()
        time.sleep(1)

    def tap_confirm_sms_pin_button(self):
        self.marionette.find_element(*self._confirm_sms_pin_button_locator).tap()
        # It just seems to need this to be safe
        time.sleep(1)

    def tap_buy_button(self):
        self.marionette.find_element(*self._buy_button_locator).tap()
        self.marionette.switch_to_frame()
        self.wait_for_element_not_present(*self._payment_frame_locator)
        time.sleep(1)
