# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class SimManager(Base):

    _page_locator = (By.ID, 'sim-manager')

    _outgoing_call_locator = (By.CSS_SELECTOR, ".sim-manager-outgoing-call-select")
    _outgoing_messages_locator = (By.CSS_SELECTOR, ".sim-manager-outgoing-messages-select")
    _outgoing_data_locator = (By.CSS_SELECTOR, ".sim-manager-outgoing-data-select")
    _back_button_locator = (By.CSS_SELECTOR, '.current header > a')
    _confirm_suspended_locator = (By.CSS_SELECTOR, '.modal-dialog-confirm-ok')

    _security_screen_page = (By.ID, 'simpin')
    _sim_security_locator = (By.CSS_SELECTOR, '[data-l10n-id="simSecurity"]')
    _sim_pin_toggle_locator = (By.CLASS_NAME, 'simpin-enabled')

    _sim_pin_screen_locator = (By.ID, 'simpin-dialog')
    _sim_pin_field_locator = (By.CSS_SELECTOR, '[data-l10n-id="simPin"]')

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    @property
    def security_screen_element(self):
        return self.marionette.find_element(*self._security_screen_page)

    @property
    def sim_pin_screen_element(self):
        return self.marionette.find_element(*self._sim_pin_screen_locator)

    def select_outgoing_calls(self, sim_option):
        self.marionette.find_element(*self._outgoing_call_locator).tap()
        self.select(sim_option)

    def select_outgoing_messages(self, sim_option):
        self.marionette.find_element(*self._outgoing_messages_locator).tap()
        self.select(sim_option)

    def select_data(self, sim_option):
        self.marionette.find_element(*self._outgoing_data_locator).tap()
        self.select(sim_option)

        # A confirmation modal about stopping the data connection gets displayed in the System app
        self.marionette.switch_to_frame()
        confirm = Wait(self.marionette).until(expected.element_present(*self._confirm_suspended_locator))
        Wait(self.marionette).until(expected.element_displayed(confirm))
        confirm.tap()
        self.apps.switch_to_displayed_app()

    @property
    def sim_for_outgoing_calls(self):
        return self._get_displayed_sim(*self._outgoing_call_locator)

    @property
    def sim_for_outgoing_messages(self):
        return self._get_displayed_sim(*self._outgoing_messages_locator)

    @property
    def sim_for_data(self):
        return self._get_displayed_sim(*self._outgoing_data_locator)

    def _get_displayed_sim(self, by, locator):
        select = self.marionette.find_element(by, locator)
        select_value = select.get_attribute('value')
        option = select.find_element(By.CSS_SELECTOR, 'option[value="%s"]' % select_value)
        return option.text

    def tap_sim_security(self):
        element = self.marionette.find_element(*self._sim_security_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._sim_pin_toggle_locator))

    def enable_sim_pin(self):
        element = self.marionette.find_element(*self._sim_pin_toggle_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._sim_pin_field_locator))
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(lambda m: self.keyboard.is_keyboard_displayed)
        self.apps.switch_to_displayed_app()
