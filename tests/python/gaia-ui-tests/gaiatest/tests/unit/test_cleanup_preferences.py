# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestCleanupPreferences(GaiaTestCase):

    def setUp(self):
        self.testvars['prefs'] = {
            'gaiauitest.pref.test_init_value': 19,
            'gaiauitest.pref.test_bool_value': True,
            'gaiauitest.pref.test_char_value': 'char',
        }
        GaiaTestCase.setUp(self)

    def test_cleanup_preferences(self):
        self.assertEqual(self.data_layer.get_int_pref('gaiauitest.pref.test_init_value'), 19)
        self.assertEqual(self.data_layer.get_bool_pref('gaiauitest.pref.test_bool_value'), True)
        self.assertEqual(self.data_layer.get_char_pref('gaiauitest.pref.test_char_value'), 'char')
