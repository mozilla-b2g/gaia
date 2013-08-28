# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Keyboard(Base):

    _select_language_locator = (
        By.XPATH,
        "//section[@id='keyboard']//li/label[input[@name='keyboard.layouts.%s']]"
    )

    def select_language(self, language):
        language_locator = (
            self._select_language_locator[0],
            self._select_language_locator[1] % language
        )
        self.wait_for_element_displayed(*language_locator)
        selected_language = self.marionette.find_element(*language_locator)
        # TODO bug 878017 - remove the explicit scroll once bug is fixed
        self.marionette.execute_script("arguments[0].scrollIntoView(false);", [selected_language])
        selected_language.tap()
