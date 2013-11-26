# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestPrefs(GaiaTestCase):

    def test_get_set_bool_pref(self):
        self.data_layer.set_bool_pref('gaiauitest.pref.enabled', True)
        test_pref = self.data_layer.get_bool_pref('gaiauitest.pref.enabled')
        self.assertEquals(test_pref, True)

    def test_get_set_int_pref(self):
        self.data_layer.set_int_pref('gaiauitest.pref.int_value', 19)
        test_pref = self.data_layer.get_int_pref('gaiauitest.pref.int_value')
        self.assertEquals(test_pref, 19)

    def test_get_set_char_pref(self):
        self.data_layer.set_char_pref('gaiauitest.pref.char_value', 'bob')
        test_pref = self.data_layer.get_char_pref('gaiauitest.pref.char_value')
        self.assertEquals(test_pref, 'bob')
