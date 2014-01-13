# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsDoNotTrack(GaiaTestCase):

    def setUp(self):

        GaiaTestCase.setUp(self)

        # make sure Do Not Track is off for the beginning of the test
        self.data_layer.set_setting('privacy.donottrackheader.enabled', False)

    def test_enable_do_not_track_via_settings_app(self):
        """Enable do not track via the Settings app"""

        settings = Settings(self.marionette)
        settings.launch()
        do_not_track_settings = settings.open_do_not_track_settings()

        # turn to "disallow tracking"
        do_not_track_settings.tap_disallow_tracking()

        # should be enabled
        self.assertEqual(self.data_layer.get_bool_pref('privacy.donottrackheader.enabled'), True)
        # should be 1
        self.assertEqual(self.data_layer.get_int_pref('privacy.donottrackheader.value'), 1)

        # turn to "allow tracking"
        do_not_track_settings.tap_allow_tracking()

        # should be enabled
        self.assertEqual(self.data_layer.get_bool_pref('privacy.donottrackheader.enabled'), True)
        # should be 0
        self.assertEqual(self.data_layer.get_int_pref('privacy.donottrackheader.value'), 0)

        # turn back to "no pref"
        do_not_track_settings.tap_do_not_have_pref_on_tracking()

        # should be disabled
        self.assertEqual(self.data_layer.get_bool_pref('privacy.donottrackheader.enabled'), False)
        # should be back to "no pref"
        self.assertEqual(self.data_layer.get_int_pref('privacy.donottrackheader.value'), -1)
