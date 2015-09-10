# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class Message(Base):
    _page_locator = (By.ID, 'messaging')

    _auto_retrieve_selector_locator = (By.NAME, 'ril.mms.retrieval_mode')
    _auto_retrieve_ok_button_locator = (By.CLASS_NAME, 'value-option-confirm')
    _sim_1_selector_locator = (By.CLASS_NAME, 'sim1')
    _sim_1_settings_page_locator = (By.ID, 'messaging-details')
    _emerg_alert_switch_locator = (By.CSS_SELECTOR,
                                   '#menuItem-emergencyAlert .pack-switch input')

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    @property
    def settings_screen_element(self):
        return self.marionette.find_element(*self._sim_1_settings_page_locator)

    def tap_auto_retrieve_selector(self):
        element = self.marionette.find_element(*self._auto_retrieve_selector_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(expected.element_displayed(
            *self._auto_retrieve_ok_button_locator))

    def close_retrieve_dialog(self):
        element = self.marionette.find_element(*self._auto_retrieve_ok_button_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        self.apps.switch_to_displayed_app()
        Wait(self.marionette).until(expected.element_displayed(self.screen_element))

    def select_sim_1(self):
        element = self.marionette.find_element(*self._sim_1_selector_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._sim_1_settings_page_locator))
