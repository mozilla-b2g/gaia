# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsGPS(GaiaTestCase):

    def setUp(self):

        GaiaTestCase.setUp(self)

        # make sure GPS is on for the beginning of the test
        self.data_layer.set_setting('geolocation.enabled', 'true')

    def test_enable_gps_via_settings_app(self):
        """ Enable GPS via the Settings app

        https://moztrap.mozilla.org/manage/case/2885/

        """
        settings = Settings(self.marionette)
        settings.launch()

        # should be on by default
        self.wait_for_condition(lambda m: settings.is_gps_enabled)

        # turn off
        settings.disable_gps()

        # should be off
        self.assertFalse(self.data_layer.get_setting('geolocation.enabled'), "GPS was not enabled via Settings app")

        # turn back on
        settings.enable_gps()

        # should be on
        self.assertTrue(self.data_layer.get_setting('geolocation.enabled'), "GPS was not disabled via Settings app")
