# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestVideoEmpty(GaiaTestCase):

    _empty_video_title_locator = ('id', 'overlay-title')
    _empty_video_text_locator = ('id', 'overlay-text')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the Video app
        self.app = self.apps.launch('Video')

    def test_empty_video(self):
        # https://moztrap.mozilla.org/manage/case/3660/
        # Requires there to be no videos on SDCard which is the default

        # Wait for the no video overlay to render
        self.wait_for_element_displayed(*self._empty_video_title_locator)
        self.wait_for_element_displayed(*self._empty_video_text_locator)

        # Verify title when no videos
        self.assertEqual(self.marionette.find_element(*self._empty_video_title_locator).text,
                         "Add videos to get started")

        # Verify text when no videos
        # Note: Text will need to be updated if/when Bug 834477 is fixed
        self.assertEqual(self.marionette.find_element(*self._empty_video_text_locator).text,
                         "Load videos on to the memory card.")
