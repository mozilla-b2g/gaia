# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.music.app import Music
from gaiatest.apps.system.app import System
from gaiatest.apps.settings.app import Settings


class TestMusicShareRingtone(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.push_resource('MUS_0001.ogg')

    def test_music_share_ringtone(self):
        """
        https://moztrap.mozilla.org/manage/case/2683/
        """

        music_app = Music(self.marionette)
        music_app.launch()
        music_app.wait_for_music_tiles_displayed()

        # switch to songs view, and play the first one on the list
        list_view = music_app.tap_songs_tab()
        songs = list_view.media
        self.assertGreater(len(songs), 0, 'The ogg file could not be found')
        player_view = songs[0].tap_first_song()

        # wait until the player view is shown, then tap the share button
        play_time = time.strptime('00:01', '%M:%S')
        Wait(self.marionette).until(lambda m: player_view.player_elapsed_time >= play_time)
        activities = player_view.tap_share_button()
        ringtone = activities.share_to_ringtones()
        ringtone.tap_save()

        system = System(self.marionette)
        self.marionette.switch_to_frame()
        system.wait_for_notification_toaster_displayed(message="Ringtone set as default.")
        system.wait_for_notification_toaster_not_displayed()

        settings = Settings(self.marionette)
        settings.launch()
        sound = settings.open_sound()

        # desktop b2g doesn't have this option visible, see bug 1130538
        if sound.ring_tone_selector_visible:
            self.assertEqual(sound.current_ring_tone, 'MUS_0001')
