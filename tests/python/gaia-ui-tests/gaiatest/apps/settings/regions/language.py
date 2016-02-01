# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.settings.app import Settings


class Language(Base):

    _select_language_locator = (By.CSS_SELECTOR, "select[name='language.current']")
    _language_options_locator = (By.CSS_SELECTOR, "select[name='language.current'] option")
    _more_language_locator = (By.CSS_SELECTOR, '.more-languages')
    _more_language_cancel_locator = (By.CSS_SELECTOR, '[data-l10n-id="cancel"]')
    _select_language_close_button_locator = (By.CLASS_NAME, "value-option-confirm")

    _language_locator = (By.ID, 'languages')

    def wait_for_languages_to_load(self):
        Wait(self.marionette).until(expected.elements_present(*self._language_options_locator))

    def go_back(self):
        settings = Settings(self.marionette)
        settings.return_to_prev_menu(settings.screen_element, self.screen_element)

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
