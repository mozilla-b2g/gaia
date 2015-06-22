# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.music.app import Music


class TestAccessibilityMusicSelectAlbum(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # add track to storage
        self.push_resource('MUS_0001.mp3')

    def test_select_album_play(self):
        music_app = Music(self.marionette)
        music_app.launch()
        music_app.wait_for_music_tiles_displayed()
        list_view = music_app.a11y_click_albums_tab()

        # check that albums (at least one) are available
        albums = list_view.media
        self.assertGreater(len(albums), 0, 'The mp3 file could not be found')

        # select an album by click
        sublist_view = albums[0].a11y_click_first_album()
        self.wait_for_element_displayed(*sublist_view._play_control_locator)
        self.assertTrue(self.accessibility.is_visible(
            self.marionette.find_element(*sublist_view._play_control_locator)))

