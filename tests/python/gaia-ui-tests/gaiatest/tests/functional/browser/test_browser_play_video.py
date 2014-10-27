# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.search.app import Search
from gaiatest.apps.search.regions.html5_player import HTML5Player
from gaiatest.apps.homescreen.regions.permission_dialog import PermissionDialog


class TestVideo(GaiaTestCase):

    acceptable_delay = 2.0

    # Video locator
    _video_element_locator = (By.TAG_NAME, 'video')

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()
        self.video_URL = self.marionette.absolute_url('VID_0001.mp4')
        self.apps.set_permission_by_url(Search.manifest_url, 'geolocation', 'deny')

    def test_play_video(self):
        """Confirm video playback

        https://moztrap.mozilla.org/manage/case/6073/
        """
        search = Search(self.marionette)
        search.launch()
        browser = search.go_to_url(self.video_URL)
        browser.wait_for_page_to_load(180)
        browser.switch_to_content()

        # Wait HTML5 player to appear
        self.wait_for_element_displayed(*self._video_element_locator)
        video = self.marionette.find_element(*self._video_element_locator)
        player = HTML5Player(self.marionette, video)

        # Make player loop, so it doesn't accidentally stops playing
        player.set_loop(True)

        # Check that video is playing
        player.wait_for_video_loaded()
        self.assertTrue(player.is_video_playing())

        # Tap on the edge of the video to make the controls appear
        player.invoke_controls()
        # Pause playback
        player.tap_pause()
        stopped_at = player.current_timestamp
        self.assertFalse(player.is_video_playing())

        # Resume playback
        player.tap_play()
        resumed_at = player.current_timestamp
        self.assertTrue(player.is_video_playing())

        # After tapping the play button, the controls disappear, make them appear again
        player.invoke_controls()

        # Tap mute button
        player.tap_mute()
        player.tap_unmute()

        # Ensure that video resumes to play
        # from the place where it was paused
        delay = resumed_at - stopped_at
        self.assertLessEqual(delay, self.acceptable_delay,
                             'video resumed to play not from place where it was paused')
        player.tap_full_screen()
        permission = PermissionDialog(self.marionette)
        self.marionette.switch_to_default_content()
        permission.wait_for_permission_dialog_displayed()
        permission.tap_to_confirm_permission()
        browser.switch_to_content()

        # These 2 lines are for some reason necessary, because Marionette on device
        # lost connection to the element for some reason
        video = self.marionette.find_element(*self._video_element_locator)
        player = HTML5Player(self.marionette, video)

        self.wait_for_condition(lambda m: player.is_fullscreen)



        # After tapping full screen, the controls disappear, make them appear again
        player.invoke_controls()
        self.wait_for_condition(lambda m: player.controls_visible)
        player.tap_full_screen()
        self.wait_for_condition(lambda m: player.is_fullscreen is False)
        self.wait_for_condition(lambda m: player.controls_visible is False)
