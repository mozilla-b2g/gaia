# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsGPS(GaiaTestCase):

    def test_enable_gps_via_settings_app(self):
        """ Enable GPS via the Settings app

        https://moztrap.mozilla.org/manage/case/2885/

        """
        settings = Settings(self.marionette)
        settings.launch()

        # should be on by default
        settings.disable_gps()

        self.assertFalse(self.data_layer.get_setting('geolocation.enabled'))
        settings.enable_gps()
        self.assertTrue(self.data_layer.get_setting('geolocation.enabled'))
