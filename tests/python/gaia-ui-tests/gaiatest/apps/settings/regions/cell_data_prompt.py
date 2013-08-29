# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class CellDataPrompt(Base):

    _cell_data_prompt_container_locator = (By.CSS_SELECTOR, '#carrier-dc-warning')
    _cell_data_prompt_turn_on_button_locator = (By.CSS_SELECTOR, '#carrier-dc-warning button[type="submit"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._cell_data_prompt_turn_on_button_locator)

    def turn_on(self):
        self.marionette.find_element(*self._cell_data_prompt_turn_on_button_locator).tap()

    @property
    def is_displayed(self):
        # The prompt container and its contents return True is_displayed erroneously
        return 'current' in self.marionette.find_element(*self._cell_data_prompt_container_locator).get_attribute('class')
