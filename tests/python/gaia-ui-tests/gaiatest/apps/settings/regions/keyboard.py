# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class Keyboard(Base):

    _section_locator = (By.ID, 'keyboard')
    _add_more_keyboards_button_locator = (By.CSS_SELECTOR, "a[href='#keyboard-selection-addMore']")
    _built_in_keyboard_list_element_locator = (By.CSS_SELECTOR, '.enabledKeyboardList > li > span')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        section = self.marionette.find_element(*self._section_locator)
        Wait(self.marionette).until(lambda m: section.location['x'] == 0)

    def tap_add_more_keyboards(self):
        self.marionette.find_element(*self._add_more_keyboards_button_locator).tap()
        return KeyboardAddMoreKeyboards(self.marionette)

    def wait_for_built_in_keyboard(self, language):
        Wait(self.marionette).until(lambda m: self.is_built_in_keyboard_present(language))

    def is_built_in_keyboard_present(self, language):
        for element in self.marionette.find_elements(*self._built_in_keyboard_list_element_locator):
            if language in element.text:
                return True

        return False


class KeyboardAddMoreKeyboards(Base):

    _section_locator = (By.ID, 'keyboard-selection-addMore')
    _select_language_locator = (
        By.XPATH,
        "//div[contains(@class,'keyboardAppContainer')]//li[label[span[bdi[text()='%s']]]]"
    )
    _header_locator = (By.CSS_SELECTOR, '.current gaia-header')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        section = self.marionette.find_element(*self._section_locator)
        Wait(self.marionette).until(lambda m: section.location['x'] == 0)

    def select_language(self, language):
        language_locator = (
            self._select_language_locator[0],
            self._select_language_locator[1] % language
        )
        element = Wait(self.marionette).until(
            expected.element_present(*language_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        checkbox = element.find_element(By.TAG_NAME, 'input')
        Wait(self.marionette).until(expected.element_selected(checkbox))

    def go_back(self):
        # TODO: remove tap with coordinates after Bug 1061698 is fixed
        self.marionette.find_element(*self._header_locator).tap(25, 25)
