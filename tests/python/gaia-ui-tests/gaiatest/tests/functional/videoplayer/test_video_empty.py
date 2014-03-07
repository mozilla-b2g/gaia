# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.videoplayer.app import VideoPlayer


class TestVideoEmpty(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

    def test_empty_video(self):
        """https://moztrap.mozilla.org/manage/case/3660/
        Requires to be no videos on SDCard, which is the default.
        """

        video_player = VideoPlayer(self.marionette)
        video_player.launch()

        # Wait for title when no videos
        self.wait_for_condition(lambda m: video_player.empty_video_title == 'Add videos to get started')

        # Verify text when no videos
        # Note: Text will need to be updated if/when Bug 834477 is fixed
        self.assertEqual(video_player.empty_video_text, 'Load videos on to the memory card.')
