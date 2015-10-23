# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.form_controls.header import GaiaHeader


UI_TESTS = "UI Tests"


class UiTests(Base):
    manifest_url = '{}uitest{}/manifest.webapp'.format(Base.DEFAULT_PROTOCOL,Base.DEFAULT_APP_HOSTNAME)

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
        element = Wait(self.marionette).until(
            expected.element_present(*self._ui_page_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

    def tap_api_button(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._api_page_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

    def tap_hw_button(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._hw_page_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

    def tap_moz_id_button(self):
        element = Wait(self.marionette, timeout=120).until(
            expected.element_present(*self._moz_id_persona_tests_button_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        # Hack to make the identity button visible from underneath the toolbar
        self.marionette.execute_script('arguments[0].scrollIntoView(false);', [element])
        element.tap()

        from gaiatest.apps.ui_tests.regions.persona import Persona

        return Persona(self.marionette)

    def tap_keyboard_option(self):
        element = Wait(self.marionette, timeout=120).until(
            expected.element_present(*self._keyboard_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        # Hack to make the keyboard button visible from underneath the toolbar
        self.marionette.execute_script('arguments[0].scrollIntoView(false);', [element])
        element.tap()

        from gaiatest.apps.ui_tests.regions.keyboard import KeyboardPage

        return KeyboardPage(self.marionette)

    def tap_back_button(self):
        GaiaHeader(self.marionette, self._test_panel_header_locator).go_back()
