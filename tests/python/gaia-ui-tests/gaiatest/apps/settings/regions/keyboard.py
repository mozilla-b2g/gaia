# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Keyboard(Base):

    _section_locator = (By.ID, 'keyboard')
    _selected_keyboards_link_locator = (By.CSS_SELECTOR, "a[data-l10n-id='selectedKeyboards']")

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        section = self.marionette.find_element(*self._section_locator)
        self.wait_for_condition(lambda m: section.location['x'] == 0)

    def tap_selected_keyboards(self):
        self.marionette.find_element(*self._selected_keyboards_link_locator).tap()
        return KeyboardSelectKeyboard(self.marionette)


class KeyboardSelectKeyboard(Base):

    _section_locator = (By.ID, 'keyboard-selection')
    _add_more_keyboards_button_locator = (By.CSS_SELECTOR, "button[data-l10n-id='addMoreKeyboards']")

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        section = self.marionette.find_element(*self._section_locator)
        self.wait_for_condition(lambda m: section.location['x'] == 0)

    def tap_add_more_keyboards(self):
        self.marionette.find_element(*self._add_more_keyboards_button_locator).tap()
        return KeyboardAddMoreKeyboards(self.marionette)


class KeyboardAddMoreKeyboards(Base):

    _section_locator = (By.ID, 'keyboard-selection-addMore')
    _select_language_locator = (
        By.XPATH,
        "//div[@id='keyboardAppContainer']//li[label[span[text()='%s']]]"
    )
    _back_button_locator = (By.CSS_SELECTOR, '.current header > a')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        section = self.marionette.find_element(*self._section_locator)
        self.wait_for_condition(lambda m: section.location['x'] == 0)

    def select_language(self, language):
        language_locator = (
            self._select_language_locator[0],
            self._select_language_locator[1] % language
        )
        self.wait_for_element_displayed(*language_locator)
        selected_language = self.marionette.find_element(*language_locator)
        # TODO bug 878017 - remove the explicit scroll once bug is fixed
        # We still need this unfortunately
        self.marionette.execute_script("arguments[0].scrollIntoView(false);", [selected_language])
        selected_language.tap()
        checkbox = selected_language.find_element(By.TAG_NAME, 'input')
        self.wait_for_condition(lambda m: checkbox.is_selected())

    def go_back(self):
        self.marionette.find_element(*self._back_button_locator).tap()
