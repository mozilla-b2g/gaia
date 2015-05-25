# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from marionette_driver import Wait, By

from gaiatest.apps.search.app import Search
from gaiatest.apps.search.regions.html5_player import HTML5Player
from gaiatest.apps.homescreen.regions.permission_dialog import PermissionDialog
from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase

class TestVideo(GaiaImageCompareTestCase):

    _video_screen_locator = (By.CSS_SELECTOR, 'body > video:nth-child(1)')

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)
        self.connect_to_local_area_network()
        self.video_URL = self.marionette.absolute_url('VID_0001.ogg')

    def test_play_video(self):
        """Confirm video playback

        https://moztrap.mozilla.org/manage/case/6073/
        Note: this test case does not reflect the entire test steps of above test case.
        """
        search = Search(self.marionette)
        search.launch()
        browser = search.go_to_url(self.video_URL)
        browser.wait_for_page_to_load(180)
        browser.switch_to_content()
        player = HTML5Player(self.marionette)
        player.wait_for_video_loaded()
        play_time = 20.0
        self.wait_for_condition(
            lambda m: player.current_timestamp == play_time,
            timeout=30,
            message='Video did not reach the end')
        self.take_screenshot()

        # Tap UI buttons. player must be reinstantiated each time after screenshot is called, because it loses context
        HTML5Player(self.marionette).tap_mute()
        self.take_screenshot()
        HTML5Player(self.marionette).tap_unmute()
        self.take_screenshot()
        HTML5Player(self.marionette).tap_full_screen()
        permission = PermissionDialog(self.marionette)
        self.marionette.switch_to_default_content()
        permission.wait_for_permission_dialog_displayed()
        permission.tap_to_confirm_permission()

        browser.switch_to_content()
        #player = HTML5Player(self.marionette)
        Wait(self.marionette).until(lambda m: HTML5Player(self.marionette).is_fullscreen)
        self.take_screenshot()

        # Temporary workaround until below methods are fixed (Bug 1163747)
        #player.show_controls()
        #Wait(self.marionette).until(lambda m: player.controls_visible)
        self.marionette.find_element(*self._video_screen_locator).tap()
        self.take_screenshot()

        # exit from fullscreen view
        player = HTML5Player(self.marionette)
        player.tap_full_screen()
        Wait(self.marionette).until(lambda m: not player.is_fullscreen)
        self.take_screenshot()

