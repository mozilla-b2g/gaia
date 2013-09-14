# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestChangeLanguage(GaiaTestCase):

    def test_change_language_settings(self):

        settings = Settings(self.marionette)
        settings.launch()
        language_settings = settings.open_language_settings()

        language_settings.select_language(u'Fran\u00E7ais')

        language_settings.go_back()

        # Verify that language has changed
        self.wait_for_condition(lambda m: settings.header_text == u'Param\u00E8tres')
        self.assertEqual(self.data_layer.get_setting('language.current'), "fr")
