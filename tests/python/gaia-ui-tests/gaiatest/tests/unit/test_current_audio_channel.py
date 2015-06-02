# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestCurrentAudio(GaiaTestCase):

    def test_current_audio(self):

        self.assertEqual(self.data_layer.current_audio_channel, u'none')
        self.marionette.execute_script("window.wrappedJSObject.soundManager.currentChannel = 'notification';")
        self.assertEqual(self.data_layer.current_audio_channel, u'notification')

        # Test that current_audio_channel doesn't switch context
        app = self.apps.launch('Clock')
        self.assertTrue(app.frame)
        current_frame = self.marionette.get_active_frame()
        self.assertEqual(self.data_layer.current_audio_channel, u'notification')
        self.assertEqual(self.marionette.get_active_frame(), current_frame)
