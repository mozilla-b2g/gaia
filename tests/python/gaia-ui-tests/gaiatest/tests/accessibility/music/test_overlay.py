# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.music.app import Music


class TestOverlay(GaiaTestCase):

    def test_empty_music(self):
        # Requires there to be no songs on SDCard which is the default
        music_app = Music(self.marionette)
        music_app.launch()

        music_app.wait_for_empty_message_to_load()

        # Check that view elements are hidden when the overlay is showing.
        self.assertTrue(self.accessibility.is_hidden(music_app.tabs))
        self.assertTrue(self.accessibility.is_hidden(music_app.views))
