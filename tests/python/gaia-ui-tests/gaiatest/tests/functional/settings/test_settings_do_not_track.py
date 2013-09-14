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

        # turned off by default
        self.wait_for_condition(
            lambda m: not do_not_track_settings.is_do_not_track_enabled
        )

        # turn on
        do_not_track_settings.enable_do_not_track()

        # should be on
        self.assertTrue(self.data_layer.get_setting('privacy.donottrackheader.enabled'),
                        'Do Not Track was not enabled via Settings app')

        # turn back off
        do_not_track_settings.disable_do_not_track()

        # should be off
        self.assertFalse(self.data_layer.get_setting('privacy.donottrackheader.enabled'),
                         'Do Not Track was not disabled via Settings app')

    def tearDown(self):

        # make sure Do Not Track is off at the end of the test
        self.data_layer.set_setting('privacy.donottrackheader.enabled', False)

        GaiaTestCase.tearDown(self)
