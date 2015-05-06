# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from marionette_driver.marionette import Actions

from gaiatest.apps.phone.app import Phone


class CallScreen(Phone):

    MAX_NUMBER_OF_DISPLAYED_DIGITS = 22

    _call_screen_locator = (By.CSS_SELECTOR, "iframe[name='call_screen']")
    # The name of this ID is due to historical reason, back in the time when
    # the CallScreen was not an attention screen. We need to update it once
    # bug 1118787 lands.
    _main_window_locator = (By.ID, 'call-screen')
    _call_options_locator = (By.ID, 'call-options')
    _calling_contact_locator = (By.CSS_SELECTOR, 'div.number')
    _calling_contact_information_locator = (By.CSS_SELECTOR, 'div.additionalContactInfo')
    _outgoing_call_locator = (By.CSS_SELECTOR, '.handled-call.outgoing')
    _incoming_call_locator = (By.CSS_SELECTOR, '.handled-call.incoming')
    _hangup_bar_locator = (By.ID, 'callbar-hang-up')
    _answer_bar_locator = (By.ID, 'callbar-answer')
    _lockscreen_handle_locator = (By.ID, 'lockscreen-area-slide')
    _bluetooth_menu_locator = (By.ID, 'bluetooth-menu')
    _views_locator = (By.ID, 'views')
    _incoming_container_locator = (By.ID, 'incoming-container')
    _incoming_answer_while_on_call_locator = (By.ID, 'incoming-answer')
    _incoming_info_while_on_call_locator = (By.ID, 'incoming-info')
    _incoming_number_while_on_call_locator = (By.ID, 'incoming-number')
    _hangup_button_locator = (By.CSS_SELECTOR, '.handled-call .hangup-button')
    _keypad_hangup_button_locator = (By.ID, 'keypad-hidebar-hang-up-action-wrapper')
    _keypad_visibility_button_locator = (By.ID, 'keypad-visibility')
    _merge_calls_button_locator = (By.ID, 'merge')
    _conference_call_label_locator = (By.ID, 'group-call-label')
    _conference_call_locator = (By.ID, 'group-call')
    _contact_background_locator = (By.ID, 'contact-background')
    _via_sim_locator = (By.CSS_SELECTOR, '.via-sim')

    def __init__(self, marionette):
        Phone.__init__(self, marionette)

        self.switch_to_call_screen_frame()

    def switch_to_call_screen_frame(self):
        self.marionette.switch_to_frame()
        frame = Wait(self.marionette, timeout=30).until(
            expected.element_present(*self._call_screen_locator))
        self.marionette.switch_to_frame(frame)

    @property
    def outgoing_calling_contact(self):
        return self.marionette.find_element(*self._outgoing_call_locator).find_element(*self._calling_contact_locator).text

    @property
    def incoming_calling_contact(self):
        return self.marionette.find_element(*self._incoming_call_locator).find_element(*self._calling_contact_locator).text

    @property
    def incoming_calling_contact_while_on_call(self):
        return self.marionette.find_element(*self._incoming_number_while_on_call_locator).text

    @property
    def calling_contact_information(self):
        return self.marionette.find_element(*self._outgoing_call_locator).find_element(*self._calling_contact_information_locator).text

    @property
    def conference_label(self):
        return self.marionette.find_element(*self._conference_call_label_locator).text

    @property
    def contact_background_style(self):
        return self.marionette.find_element(*self._contact_background_locator).get_attribute('style')

    @property
    def outgoing_via_sim(self):
        return self.marionette.find_element(*self._outgoing_call_locator).find_element(*self._via_sim_locator).text

    @property
    def incoming_via_sim(self):
        return self.marionette.find_element(*self._incoming_call_locator).find_element(*self._via_sim_locator).text

    def wait_for_outgoing_call(self):
        call = self.marionette.find_element(*self._outgoing_call_locator)
        contact = call.find_element(*self._calling_contact_locator)
        Wait(self.marionette).until(lambda m: call.location['y'] == 0 and contact.text)

    def wait_for_incoming_call(self):
        main_window = self.marionette.find_element(*self._main_window_locator)
        Wait(self.marionette).until(expected.element_displayed(main_window))
        call = self.marionette.find_element(*self._incoming_call_locator)
        contact = call.find_element(*self._calling_contact_locator)
        Wait(self.marionette).until(lambda m: main_window.location['y'] == 0 and contact.text)

    def wait_for_incoming_call_while_on_call(self):
        call = self.marionette.find_element(*self._incoming_info_while_on_call_locator)
        contact = self.marionette.find_element(*self._incoming_number_while_on_call_locator)
        Wait(self.marionette).until(lambda m: call.is_displayed() and contact.text)

    def answer_call(self):
        self.marionette.find_element(*self._answer_bar_locator).tap()

    def answer_call_while_on_call(self):
        self.marionette.find_element(*self._incoming_answer_while_on_call_locator).tap()

    def a11y_click_hang_up(self):
        self.accessibility.click(self.marionette.find_element(*self._hangup_bar_locator))

    def a11y_click_keypad_hang_up(self):
        self.accessibility.click(self.marionette.find_element(*self._keypad_hangup_button_locator))

    def hang_up(self):
        self.marionette.find_element(*self._hangup_bar_locator).tap()
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(
            expected.element_not_displayed(*self._call_screen_locator))

    def a11y_hang_up(self):
        self.a11y_click_hang_up()
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(
            expected.element_not_displayed(*self._call_screen_locator))

    def a11y_keypad_hang_up(self):
        self.a11y_click_keypad_hang_up()
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(
            expected.element_not_displayed(*self._call_screen_locator))

    def _handle_incoming_call(self, destination):

        lockscreen_handle = self.marionette.find_element(*self._lockscreen_handle_locator)
        lockscreen_handle_x_centre = int(lockscreen_handle.size['width'] / 2)
        lockscreen_handle_y_centre = int(lockscreen_handle.size['height'] / 2)

        handle_destination = lockscreen_handle.size['width']
        if destination == 'reject':
            handle_destination = 0

        # Flick lockscreen handle to the destination
        Actions(self.marionette).flick(
            lockscreen_handle, lockscreen_handle_x_centre, lockscreen_handle_y_centre, handle_destination, 0
        ).perform()

    def reject_call(self):
        Wait(self.marionette).until(
            expected.element_displayed(*self._lockscreen_handle_locator))
        self._handle_incoming_call('reject')
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(
            expected.element_not_displayed(*self._call_screen_locator))

    def a11y_click_keypad_visibility_button(self):
        self.accessibility.click(self.marionette.find_element(
            *self._keypad_visibility_button_locator))

    def merge_calls(self):
        self.marionette.find_element(*self._merge_calls_button_locator).tap()
        Wait(self.marionette).until(
            expected.element_displayed(*self._conference_call_locator))
