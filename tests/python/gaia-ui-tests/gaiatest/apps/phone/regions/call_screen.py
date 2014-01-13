# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from marionette.by import By
from gaiatest.apps.phone.app import Phone


class CallScreen(Phone):

    _call_screen_locator = (By.CSS_SELECTOR, "iframe[name='call_screen0']")
    _calling_contact_locator = (By.CSS_SELECTOR, 'div.number')
    _calling_contact_information_locator = (By.CSS_SELECTOR, 'div.additionalContactInfo')
    _outgoing_call_locator = (By.CSS_SELECTOR, '.handled-call.outgoing')
    _hangup_bar_locator = (By.ID, 'callbar-hang-up')

    def __init__(self, marionette):
        Phone.__init__(self, marionette)

        self.marionette.switch_to_frame()

        self.wait_for_element_present(*self._call_screen_locator, timeout=30)

        call_screen = self.marionette.find_element(*self._call_screen_locator)
        self.marionette.switch_to_frame(call_screen)

    @property
    def outgoing_calling_contact(self):
        return self.marionette.find_element(*self._outgoing_call_locator).find_element(*self._calling_contact_locator).text

    @property
    def calling_contact_information(self):
        return self.marionette.find_element(*self._outgoing_call_locator).find_element(*self._calling_contact_information_locator).text

    def wait_for_outgoing_call(self):
        outgoing_call = self.marionette.find_element(*self._outgoing_call_locator)
        self.wait_for_condition(lambda m: outgoing_call.location['y'] == 0)
        self.wait_for_condition(lambda m: self.outgoing_calling_contact != u'')

    def tap_hang_up(self):
        hang_up = self.marionette.find_element(*self._hangup_bar_locator)
        hang_up.tap()

    def hang_up(self):
        self.tap_hang_up()
        self.marionette.switch_to_frame()
        self.wait_for_element_not_present(*self._call_screen_locator)
