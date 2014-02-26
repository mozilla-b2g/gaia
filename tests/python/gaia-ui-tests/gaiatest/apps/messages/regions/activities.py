# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Activities(Base):

    _actions_menu_locator = (By.CSS_SELECTOR, 'body > form[data-type="action"]')
    _settings_button_locator = (By.XPATH, '//*[text()="Settings"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._actions_menu_locator)

    def tap_settings(self):
        self.marionette.find_element(*self._settings_button_locator).tap()
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == 'Settings')
        self.apps.switch_to_displayed_app()
        from gaiatest.apps.messages.regions.messaging_settings import MessagingSettings
        return MessagingSettings(self.marionette)
