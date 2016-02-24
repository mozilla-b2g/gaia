# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from gaiatest.apps.base import Base, PageRegion


class Notes(Base):

    name = 'Notes'

    manifest_url = "https://marketplace.firefox.com/app/dcdaeefc-26f4-4af6-ad22-82eb93beadcd/manifest.webapp"

    _app_ready_locator = (By.CSS_SELECTOR, 'header')
    _note_content_locator = (By.ID, 'note-content')
    _save_note = (By.ID, 'button-note-save')
    _check_note_title_locator = (By.CSS_SELECTOR, '.note .title')

    def launch(self):
        Base.launch(self)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._app_ready_locator))))

    def write_and_save_note(self, text):
        note_content = Wait(self.marionette).until(expected.element_present(*self._note_content_locator))
        Wait(self.marionette).until(expected.element_displayed(note_content))
        note_content.tap()
        note_content.send_keys(text)
        self.marionette.find_element(*self._save_note).tap()
        return NotesMainMenu(self.marionette)

    @property
    def first_note_title(self):
        return self.marionette.find_element(*self._note_content_locator).text


class NotesMainMenu(PageRegion):

    _main_locator = (By.ID, 'main')
    _note_content_locator = (By.ID, 'note-content')

    def __init__(self, marionette):
        PageRegion.__init__(self, marionette, marionette.find_element(*self._main_locator))
        Wait(self.marionette).until(lambda m: self.root_element.rect['x'] == 0 and self.root_element.is_displayed())

    @property
    def first_note_title(self):
        return self.marionette.find_element(*self._note_content_locator).text
