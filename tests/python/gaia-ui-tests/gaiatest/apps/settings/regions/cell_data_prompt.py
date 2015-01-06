# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class CellDataPrompt(Base):

    _cell_data_prompt_container_locator = (By.CSS_SELECTOR, '#settings-confirm-dialog')
    _cell_data_prompt_turn_on_button_locator = (By.CSS_SELECTOR, '#settings-confirm-dialog button[data-l10n-id="turnOn"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_condition(lambda m: 'current' in m.find_element(*self._cell_data_prompt_container_locator).get_attribute('class'))

    def turn_on(self):
        container = self.marionette.find_element(*self._cell_data_prompt_container_locator)
        self.marionette.find_element(*self._cell_data_prompt_turn_on_button_locator).tap()
        self.wait_for_condition(lambda m: container.location['x'] == container.size['width'])
