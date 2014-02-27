# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class WindowOpenPage(Base):

    _frame_locator = (By.CSS_SELECTOR, '#test-iframe[src*="open"]')
    _window_open_from_iframe_button_locator = (By.CSS_SELECTOR, 'button:not(.mozbrowser)[data-url="./popup.html"]')

    def switch_to_frame(self):
        self.wait_for_element_displayed(*self._frame_locator)
        window_open_page_iframe = self.marionette.find_element(*self._frame_locator)
        self.marionette.switch_to_frame(window_open_page_iframe)

    def tap_window_open_from_iframe(self):
        self.marionette.find_element(*self._window_open_from_iframe_button_locator).tap()
        return PopUpPage(self.marionette)

class PopUpPage(Base):

    _frame_locator = (By.CSS_SELECTOR, 'iframe[data-url$="popup.html"]')
    _header_text_locator = (By.CSS_SELECTOR, 'h1')
    _x_button_locator = (By.ID, 'popup-close')

    def switch_to_frame(self):
        self.marionette.switch_to_frame()
        self.wait_for_element_displayed(*self._frame_locator)
        popup_page_iframe = self.marionette.find_element(*self._frame_locator)
        self.marionette.switch_to_frame(popup_page_iframe)

    @property
    def header_text(self):
        return self.marionette.find_element(*self._header_text_locator).text

    def tap_x_button(self):
        self.marionette.switch_to_frame()
        self.marionette.find_element(*self._x_button_locator).tap()
        self.wait_for_element_not_present(*self._frame_locator)

    @property
    def is_popup_page_displayed(self):
        self.marionette.switch_to_frame()
        return self.is_element_displayed(*self._frame_locator)
