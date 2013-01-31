# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from gaiatest import GaiaTestCase


class TestDialer(GaiaTestCase):

    # Dialer app
    _keyboard_container_locator = ('id', 'keyboard-container')
    _phone_number_view_locator = ('id', 'phone-number-view')
    _call_bar_locator = ('id', 'keypad-callbar-call-action')

    # Call Screen app
    _calling_number_locator = ('css selector', "div.number")
    _outgoing_call_locator = ('css selector', 'div.direction.outgoing')
    _hangup_bar_locator = ('id', 'callbar-hang-up-action')
    _call_screen_locator = ('css selector', "iframe[name='call_screen']")

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the app
        self.app = self.apps.launch('Phone')

    def test_dialer_make_call(self):
        # https://moztrap.mozilla.org/manage/case/1298/

        test_phone_number = self.testvars['twilio']['phone_number']

        self.wait_for_element_displayed(*self._keyboard_container_locator)

        self._dial_number(test_phone_number)

        # Assert that the number was entered correctly.
        phone_view = self.marionette.find_element(*self._phone_number_view_locator)

        self.assertEqual(phone_view.get_attribute('value'), test_phone_number)

        # Click the call button
        self.marionette.tap(self.marionette.find_element(*self._call_bar_locator))

        # Switch to top level frame
        self.marionette.switch_to_frame()

        # Wait for call screen then switch to it
        self.wait_for_element_present(*self._call_screen_locator, timeout=30)
        call_screen = self.marionette.find_element(*self._call_screen_locator)
        self.marionette.switch_to_frame(call_screen)

        # Wait for call screen to be dialing
        self.wait_for_element_displayed(*self._outgoing_call_locator)

        # Wait for the state to get to 'alerting' which means connection made
        self.wait_for_condition(lambda m: self.data_layer.active_telephony_state == "alerting", timeout=30)

        # Check the number displayed is the one we dialed
        self.assertEqual(test_phone_number,
            self.marionette.find_element(*self._calling_number_locator).text)

        # hang up before the person answers ;)
        self.marionette.tap(self.marionette.find_element(*self._hangup_bar_locator))

    def _dial_number(self, phone_number):
        '''
        Dial a number using the keypad
        '''

        for i in phone_number:
            if i == "+":
                zero_button = self.marionette.find_element('css selector', 'div.keypad-key[data-value="0"]')
                self.marionette.long_press(zero_button, 1200)
                # Wait same time as the long_press to bust the asynchronous
                # TODO https://bugzilla.mozilla.org/show_bug.cgi?id=815115
                time.sleep(2)

            else:
                self.marionette.tap(self.marionette.find_element('css selector', 'div.keypad-key[data-value="%s"]' % i))
                time.sleep(0.25)

