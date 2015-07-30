# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsChangeRingTone(GaiaTestCase):

    def test_settings_change_ring_tone(self):
        """
        https://moztrap.mozilla.org/manage/case/1422/
        """

        settings = Settings(self.marionette)
        settings.launch()
        sound = settings.open_sound()

        old_ring_tone = sound.current_ring_tone

        # Check that the default ring tone 'Firefox' is selected by default
        self.assertEqual(sound.current_ring_tone, 'Firefox')

        ring_tones_app = sound.tap_ring_tone_selector()


        ring_tones_app.ring_tones[10].select_ring_tone()
        new_ring_tone = ring_tones_app.ring_tones[10].name

        ring_tones_app.set_ringtone()

        settings.switch_to_settings_app()
        self.assertNotEqual(old_ring_tone, sound.current_ring_tone)
        self.assertEqual(new_ring_tone, sound.current_ring_tone)
