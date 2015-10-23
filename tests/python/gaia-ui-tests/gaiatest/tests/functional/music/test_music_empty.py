# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.music.app import Music


class TestMusicEmpty(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

    def test_empty_music(self):
        """https://moztrap.mozilla.org/manage/case/3668/"""

        # Requires there to be no songs on SDCard which is the default
        music_app = Music(self.marionette)
        music_app.launch()

        music_app.wait_for_empty_message_to_load()
