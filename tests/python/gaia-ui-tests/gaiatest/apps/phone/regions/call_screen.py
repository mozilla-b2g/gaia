# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.marionette import Actions
from gaiatest.apps.phone.app import Phone


class CallScreen(Phone):

    _call_screen_locator = (By.CSS_SELECTOR, "iframe[name='call_screen']")
    _calling_contact_locator = (By.CSS_SELECTOR, 'div.number')
    _calling_contact_information_locator = (By.CSS_SELECTOR, 'div.additionalContactInfo')
    _outgoing_call_locator = (By.CSS_SELECTOR, '.handled-call.outgoing')
    _incoming_call_locator = (By.CSS_SELECTOR, '.handled-call.incoming')
    _hangup_bar_locator = (By.ID, 'callbar-hang-up')
    _answer_bar_locator = (By.ID, 'callbar-answer')
    _lockscreen_handle_locator = (By.ID, 'lockscreen-area-slide')
    _bluetooth_menu_locator = (By.ID, 'bluetooth-menu')

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
    def incoming_calling_contact(self):
        return self.marionette.find_element(*self._incoming_call_locator).find_element(*self._calling_contact_locator).text

    @property
    def calling_contact_information(self):
        return self.marionette.find_element(*self._outgoing_call_locator).find_element(*self._calling_contact_information_locator).text

    def wait_for_outgoing_call(self):
        outgoing_call = self.marionette.find_element(*self._outgoing_call_locator)
        self.wait_for_condition(lambda m: outgoing_call.location['y'] == 0)
        self.wait_for_condition(lambda m: self.outgoing_calling_contact != u'')

    def wait_for_incoming_call(self):
        incoming_call = self.marionette.find_element(*self._incoming_call_locator)
        self.wait_for_condition(lambda m: incoming_call.location['y'] == 0)
        self.wait_for_condition(lambda m: self.incoming_calling_contact != u'')

    def wait_for_incoming_call_with_locked_screen(self):
        self.wait_for_condition(lambda m: self.is_element_displayed(*self._incoming_call_locator))
        self.wait_for_condition(lambda m: self.incoming_calling_contact != u'')

    def answer_call(self):
        self.marionette.find_element(*self._answer_bar_locator).tap()

    def a11y_click_hang_up(self):
        self.accessibility.click(self.marionette.find_element(*self._hangup_bar_locator))

    def hang_up(self):
        self.marionette.find_element(*self._hangup_bar_locator).tap()
        self.marionette.switch_to_frame()
        self.wait_for_element_not_displayed(*self._call_screen_locator)

    def a11y_hang_up(self):
        self.a11y_click_hang_up()
        self.marionette.switch_to_frame()
        self.wait_for_element_not_displayed(*self._call_screen_locator)

    def _handle_incoming_call(self, destination):

        lockscreen_handle = self.marionette.find_element(*self._lockscreen_handle_locator)
        lockscreen_handle_x_centre = int(lockscreen_handle.size['width'] / 2)
        lockscreen_handle_y_centre = int(lockscreen_handle.size['height'] / 2)

        handle_destination = lockscreen_handle.size['width']
        if destination == 'reject':
            handle_destination *= -1

        # Flick lockscreen handle to the destination
        Actions(self.marionette).flick(
            lockscreen_handle, lockscreen_handle_x_centre, lockscreen_handle_y_centre, handle_destination, 0
        ).perform()

    def reject_call(self):
        self.wait_for_element_displayed(*self._lockscreen_handle_locator)
        self._handle_incoming_call('reject')
        self.marionette.switch_to_frame()
