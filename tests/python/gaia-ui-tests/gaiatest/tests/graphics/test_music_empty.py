# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.music.app import Music


class TestMusicEmpty(GaiaImageCompareTestCase):

    # Note: Text will need to be updated if/when Bug 834475 is fixed
    expected_title = 'Add songs to get started'
    expected_text = 'Load songs on to the memory card.'

    def test_music_empty(self):
        """https://moztrap.mozilla.org/manage/case/3668/"""

        # Requires there to be no songs on SDCard which is the default
        music_app = Music(self.marionette)
        music_app.launch()

        music_app.wait_for_empty_message_to_load()
        self.take_screenshot()

        # Verify title & text when no music present
        self.assertEqual(music_app.empty_music_title, self.expected_title)
        self.assertEqual(music_app.empty_music_text, self.expected_text)
