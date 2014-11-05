# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


UI_TESTS = "UI Tests"


class UiTests(Base):
    _test_panel_header_locator = (By.CSS_SELECTOR, '#test-panel-header')
    _ui_page_locator = (By.CSS_SELECTOR, 'a[href="#UI"]')
    _api_page_locator = (By.CSS_SELECTOR, 'a[href="#API"]')
    _hw_page_locator = (By.CSS_SELECTOR, 'a[href="#HW"]')

    _moz_id_persona_tests_button_locator = (By.ID, 'mozId-persona')
    _keyboard_locator = (By.LINK_TEXT, 'Keyboard')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.name = UI_TESTS

    def launch(self):
        Base.launch(self, launch_timeout=120000)

    def tap_ui_button(self):
        self.wait_for_element_displayed(*self._ui_page_locator)
        self.marionette.find_element(*self._ui_page_locator).tap()

    def tap_api_button(self):
        self.wait_for_element_displayed(*self._api_page_locator)
        self.marionette.find_element(*self._api_page_locator).tap()

    def tap_hw_button(self):
        self.wait_for_element_displayed(*self._hw_page_locator)
        self.marionette.find_element(*self._hw_page_locator).tap()

    def tap_moz_id_button(self):
        self.wait_for_element_displayed(*self._moz_id_persona_tests_button_locator, timeout=120)
        # Hack to make the identity button visible from underneath the toolbar
        mozId_button = self.marionette.find_element(*self._moz_id_persona_tests_button_locator)
        self.marionette.execute_script('arguments[0].scrollIntoView(false);', [mozId_button])
        mozId_button.tap()

        from gaiatest.apps.ui_tests.regions.persona import Persona

        return Persona(self.marionette)

    def tap_keyboard_option(self):
        self.wait_for_element_displayed(*self._keyboard_locator, timeout=120)
        # Hack to make the keyboard button visible from underneath the toolbar
        keyboard_button = self.marionette.find_element(*self._keyboard_locator)
        self.marionette.execute_script('arguments[0].scrollIntoView(false);', [keyboard_button])
        keyboard_button.tap()

        from gaiatest.apps.ui_tests.regions.keyboard import KeyboardPage

        return KeyboardPage(self.marionette)

    def tap_back_button(self):
        self.wait_for_element_displayed(*self._test_panel_header_locator)

        # TODO: remove tap with coordinates after Bug 1061698 is fixed
        self.marionette.find_element(*self._test_panel_header_locator).tap(25, 25)

        self.wait_for_element_not_displayed(*self._test_panel_header_locator)
