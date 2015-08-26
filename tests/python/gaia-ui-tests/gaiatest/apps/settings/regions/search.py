# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class Search(Base):

    _search_selector_locator = (By.NAME, "search.provider")
    _search_selector_confirmation_button_locator = (By.CLASS_NAME, "value-option-confirm")

    def select_search_engine(self, value):
        element = Wait(self.marionette).until(
            expected.element_present(*self._search_selector_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        self.select(value)

    def open_select_search_engine(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._search_selector_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

    def close_select_search_engine(self):
        self.marionette.switch_to_frame()
        self.marionette.find_element(*self._search_selector_confirmation_button_locator).tap()
        self.apps.switch_to_displayed_app()
        element = Wait(self.marionette).until(
            expected.element_present(*self._search_selector_locator))
        Wait(self.marionette).until(expected.element_displayed(element))

