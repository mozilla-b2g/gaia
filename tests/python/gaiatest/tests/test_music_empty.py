# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestMusicEmpty(GaiaTestCase):

    _empty_music_title_locator = ('id', 'overlay-title')
    _empty_music_text_locator = ('id', 'overlay-text')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the Music app
        self.app = self.apps.launch('Music')

    def test_empty_music(self):
        # https://moztrap.mozilla.org/manage/case/3668/
        # Requires there to be no songs on SDCard which is the default

        # Wait for the no music overlay to render
        self.wait_for_element_displayed(*self._empty_music_title_locator)
        self.wait_for_element_displayed(*self._empty_music_text_locator)

        # Verify title when no music
        self.assertEqual(self.marionette.find_element(*self._empty_music_title_locator).text,
                         "Add songs to get started")

        # Verify text when no music
        # Note: Text will need to be updated if/when Bug 834475 is fixed
        self.assertEqual(self.marionette.find_element(*self._empty_music_text_locator).text,
                         "Load songs on to the memory card.")
