# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class Persona(Base):
    _app_ready_event = (By.CSS_SELECTOR, 'li.ready')
    _app_login_event = (By.CSS_SELECTOR, 'li.login')
    _app_logout_event = (By.CSS_SELECTOR, 'li.logout')
    _app_login_assertion_text = (By.CSS_SELECTOR, 'li.login div.assertion')
    _app_std_request_button_locator = (By.ID, 't-request')
    _app_logout_button_locator = (By.ID, 't-logout')

    _frame_locator = (By.CSS_SELECTOR, 'iframe[src*="identity"]')

    def tap_standard_sign_in(self):
        self.tap_standard_button()
        from gaiatest.apps.persona.app import Persona
        persona = Persona(self.marionette)
        persona.switch_to_persona_frame()
        return persona

    def switch_to_frame(self):
        frame = Wait(self.marionette).until(
            expected.element_present(*self._frame_locator))
        Wait(self.marionette).until(expected.element_displayed(frame))
        self.marionette.switch_to_frame(frame)
        self.wait_for_ready_event()

    def get_assertion(self):
        # Gets the last assertion in the event stream list, use logout event to make sure
        # we're done getting assertions
        return self.marionette.find_elements(*self._app_login_assertion_text)[-1].text

    def tap_standard_button(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._app_std_request_button_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

    def tap_logout_button(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._app_logout_button_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

    def wait_for_logout_event(self):
        Wait(self.marionette).until(
            expected.element_displayed(*self._app_logout_event))

    def wait_for_ready_event(self):
        Wait(self.marionette).until(
            expected.element_displayed(*self._app_ready_event))

    def wait_for_login_event(self):
        Wait(self.marionette).until(
            expected.element_displayed(*self._app_login_event))
