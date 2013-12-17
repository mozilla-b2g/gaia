# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Activities(Base):

    _actions_menu_locator = (By.CSS_SELECTOR, 'body > form[data-type="action"]')
    _action_option_locator = (By.CSS_SELECTOR, 'form[data-type="action"] button')

    _settings_button_locator = (By.XPATH, '//*[text()="Settings"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._actions_menu_locator)

    def tap_settings(self):
        self.marionette.find_element(*self._settings_button_locator).tap()
        from gaiatest.apps.settings.app import Settings
        return Settings(self.marionette)

    @property
    def options_count(self):
        return len(self.marionette.find_elements(*self._action_option_locator))

    @property
    def is_menu_visible(self):
        return self.is_element_displayed(*self._actions_menu_locator)
