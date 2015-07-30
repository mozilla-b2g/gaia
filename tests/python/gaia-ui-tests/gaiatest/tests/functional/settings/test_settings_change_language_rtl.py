# -*- coding: utf-8 -*

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestChangeLanguageRTL(GaiaTestCase):

    def test_change_language_settings_rtl(self):
        lang_name = self.marionette.execute_script("""
            var qps = window.wrappedJSObject.navigator.mozL10n.qps;
            return qps['qps-plocm'].translate('Packaged Mirrored');
        """)
        header = self.marionette.execute_script("""
            var qps = window.wrappedJSObject.navigator.mozL10n.qps;
            return qps['qps-plocm'].translate('Settings');
        """)

        self.data_layer.set_setting('devtools.qps.enabled', True)
        settings = Settings(self.marionette)
        settings.launch()

        language_settings = settings.open_language()
        language_settings.select_language(lang_name)

        self.wait_for_condition(lambda m: language_settings.current_language == 'qps-plocm')
        language_settings.go_back()

        # Verify that language has changed
        self.wait_for_condition(lambda m: settings.header_text == header)
        self.assertEqual(self.data_layer.get_setting('language.current'), 'qps-plocm')
