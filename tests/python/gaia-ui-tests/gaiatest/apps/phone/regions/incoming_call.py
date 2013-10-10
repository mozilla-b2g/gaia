# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class IncomingCall(Base):
    _oncall_frame_locator = (By.CSS_SELECTOR, 'iframe[data-url*=oncall]')
    _incoming_number_locator = (By.CSS_SELECTOR, 'section[id=""] > .numberWrapper > div.number')
    _answer_button_locator = (By.ID, 'callbar-start-call-action')
    _hangup_button_locator = (By.ID, 'callbar-hang-up-action')

    def switch_to_incoming_call_frame(self):
        self.marionette.switch_to_frame()
        iframe = self.marionette.find_element(*self._oncall_frame_locator)
        self.marionette.switch_to_frame(iframe)

    def wait_for_incoming_call(self):
        self.wait_for_condition(lambda m: len(m.find_element(*self._incoming_number_locator).text) != 0)

    def wait_for_call_ended(self):
        self.marionette.switch_to_frame()
        self.wait_for_condition(lambda m: len(m.find_elements(*self._oncall_frame_locator)) == 0)

    def answer_call(self):
        # TODO return an app object for the screen after receiving call
        self.marionette.find_element(*self._answer_button_locator).tap()

    def hangup_call(self):
        self.marionette.find_element(*self._hangup_button_locator).tap()
        self.wait_for_call_ended()

    @property
    def incoming_number(self):
        return self.marionette.find_element(*self._incoming_number_locator).text
