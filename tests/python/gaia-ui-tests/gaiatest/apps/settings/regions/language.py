# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class Language(Base):

    _select_language_locator = (By.CSS_SELECTOR, "select[name='language.current']")
    _language_options_locator = (By.CSS_SELECTOR, "select[name='language.current'] option")
    _header_locator = (By.CSS_SELECTOR, '.current gaia-header')
    _more_language_locator = (By.CSS_SELECTOR, '.more-languages')
    _more_language_cancel_locator = (By.CSS_SELECTOR, '[data-l10n-id="cancel"]')
    _select_language_close_button_locator = (By.CLASS_NAME, "value-option-confirm")

    _language_locator = (By.ID, 'languages')

    def wait_for_languages_to_load(self):
        Wait(self.marionette).until(expected.elements_present(*self._language_options_locator))

    def go_back(self):
        element = Wait(self.marionette).until(expected.element_present(*self._header_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        # TODO: replace this hard coded value with tap on the back button, after Bug 1061698 is fixed
        element.tap(x=10)
        Wait(self.marionette).until(lambda m: m.execute_script(
            "return window.wrappedJSObject.Settings && window.wrappedJSObject.Settings._currentPanel === '#root'"))

    def open_select_language(self):
        self.marionette.find_element(*self._select_language_locator).tap()
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(expected.element_present(*self._select_language_close_button_locator))

    def close_select_language(self):
        self.marionette.find_element(*self._select_language_close_button_locator).tap()
        self.apps.switch_to_displayed_app()
        Wait(self.marionette).until(expected.element_present(*self._select_language_locator))

    def select_language(self, language):
        self.marionette.find_element(*self._select_language_locator).tap()
        self.select(language)

    def open_get_language(self):
        self.marionette.find_element(*self._more_language_locator).tap()
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(expected.element_present(*self._more_language_cancel_locator))

    def close_get_language(self):
        self.marionette.find_element(*self._more_language_cancel_locator).tap()
        self.apps.switch_to_displayed_app()
        Wait(self.marionette).until(expected.element_present(*self._more_language_locator))

    @property
    def current_language(self):
        return self.marionette.find_element(By.CSS_SELECTOR, 'html').get_attribute('lang')

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._language_locator)

    def select(self, match_string):
        # This needs to be duplicated from base.py for a few reasons:
        # 1. When we return from the frame we don't return to the Settings app in its initial state,
        #    so the wait for in its launch method times out
        # 2. We need to use in instead of == on the match text because of the directional strings

        # have to go back to top level to get the B2G select box wrapper
        self.marionette.switch_to_frame()

        options = Wait(self.marionette).until(expected.elements_present(
            By.CSS_SELECTOR, '.value-selector-container li'))
        close = self.marionette.find_element(By.CSS_SELECTOR, 'button.value-option-confirm')

        # loop options until we find the match
        for li in options:
            if match_string in li.text:
                li.tap()
                break
        else:
            raise Exception("Element '%s' could not be found in select wrapper" % match_string)

        close.tap()
        Wait(self.marionette).until(expected.element_not_displayed(close))

        # TODO we should find something suitable to wait for, but this goes too
        # fast against desktop builds causing intermittent failures
        time.sleep(0.2)

        # now back to app
        self.apps.switch_to_displayed_app()
