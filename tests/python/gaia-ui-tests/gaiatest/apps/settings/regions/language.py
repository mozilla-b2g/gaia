# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Language(Base):

    _select_language_locator = (By.CSS_SELECTOR, '#languages li:nth-child(2) .icon-dialog select')
    _back_button_locator = (By.CSS_SELECTOR, '.current header > a')

    def go_back(self):
        self.marionette.find_element(*self._back_button_locator).tap()

    def select_language(self, language):
        self.marionette.find_element(*self._select_language_locator).tap()
        self.select(language)

    def select(self, match_string):
        # This needs to be duplicated from base.py for a few reasons:
        # 1. The launch() method at the end is failing for some reason
        # 2. When we return from the frame we don't return to the Settings app in its initial state,
        #    so the wait for in its launch method times out
        # 3. We need to use in instead of == on the match text because of the directional strings

        # have to go back to top level to get the B2G select box wrapper
        self.marionette.switch_to_frame()

        self.wait_for_condition(lambda m: len(self.marionette.find_elements(By.CSS_SELECTOR, '#value-selector-container li')) > 0)

        options = self.marionette.find_elements(By.CSS_SELECTOR, '#value-selector-container li')
        close_button = self.marionette.find_element(By.CSS_SELECTOR, 'button.value-option-confirm')

        # loop options until we find the match
        for li in options:
            if match_string in li.text:
                # TODO Remove scrollintoView upon resolution of bug 877651
                self.marionette.execute_script(
                    'arguments[0].scrollIntoView(false);', [li])
                li.tap()
                break

        close_button.tap()

        # now back to app
        self.marionette.switch_to_frame(self.apps.displayed_app.frame)
