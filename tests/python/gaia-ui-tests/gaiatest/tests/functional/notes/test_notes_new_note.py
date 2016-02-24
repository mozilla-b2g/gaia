# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.notes.app import Notes, NotesMainMenu


class TestNotes (GaiaTestCase):

    def test_notes_launch(self):

        # This test creates a note and verifies that by checking the text

        note_text = 'I am a note!'

        self.notes = Notes(self.marionette)
        self.notes.launch()

        main_menu = self.notes.write_and_save_note(note_text)
        self.assertEqual(main_menu.first_note_title, note_text)
