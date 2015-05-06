# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.search.app import Search
from gaiatest.apps.search.regions.html5_player import HTML5Player
from gaiatest.apps.homescreen.regions.permission_dialog import PermissionDialog


class TestVideo(GaiaTestCase):

    acceptable_delay = 2.0

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()
        self.video_URL = self.marionette.absolute_url('VID_0001.ogg')

    def test_play_video(self):
        """Confirm video playback

        https://moztrap.mozilla.org/manage/case/6073/
        """
        search = Search(self.marionette)
        search.launch()
        browser = search.go_to_url(self.video_URL)
        browser.wait_for_page_to_load(180)
        browser.switch_to_content()

        player = HTML5Player(self.marionette)

        # Check that video is playing
        player.wait_for_video_loaded()
        self.assertTrue(player.is_playing)

        # Tap on the edge of the video to make the controls appear
        player.invoke_controls()
        # Pause playback
        player.tap_pause()
        stopped_at = player.current_timestamp
        self.assertFalse(player.is_playing)

        resumed_at = player.current_timestamp

        # Resume playback
        player.tap_play()

        # Ensure that video resumes to play
        # from the place where it was paused
        delay = resumed_at - stopped_at
        self.assertLessEqual(delay, self.acceptable_delay,
                             'video resumed to play not from place where it was paused, paused at %.3f, resumed at %.3f' % (stopped_at, resumed_at))

        # Make sure the video is ready to play again
        player.wait_for_video_loaded()

        self.assertTrue(player.is_playing)

        # After tapping the play button, the controls disappear, make them appear again
        player.invoke_controls()

        # Tap mute button
        player.tap_mute()
        player.tap_unmute()

        player.tap_full_screen()
        permission = PermissionDialog(self.marionette)
        self.marionette.switch_to_default_content()
        permission.wait_for_permission_dialog_displayed()
        permission.tap_to_confirm_permission()

        # The interaction with the permission dialog makes us
        # loose connection to the player frame, so we need to reconnect
        browser.switch_to_content()
        player = HTML5Player(self.marionette)

        Wait(self.marionette).until(lambda m: player.is_fullscreen)

        # After tapping full screen, the controls disappear, make them appear again
        # Normally, we would use invoke_controls(), but this seems to cause intermittent failures
        # Bug 1111734 is filed to replace invoke_controls() to show_controls(), once it is possible
        Wait(self.marionette).until(lambda m: player.controls_visible is False)
        player.show_controls()
        Wait(self.marionette).until(lambda m: player.controls_visible)

        player.tap_full_screen()
        Wait(self.marionette).until(lambda m: player.is_fullscreen is False)
        Wait(self.marionette).until(lambda m: player.controls_visible is False)
