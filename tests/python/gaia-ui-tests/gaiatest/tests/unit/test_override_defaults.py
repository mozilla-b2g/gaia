# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase

TEST_DEFAULTS = {'ftu.manifestURL': 'app://ftu.gaiamobile.org/manifest.webapp'}
TEST_DEFAULT_PREFS = {'foo.barint': 99,
                      'foo.barbool': True,
                      'foo.barstring': 'blahblah'}

class TestOverrideDefaults(GaiaTestCase):

    def modify_settings(self, settings):
        settings.update(TEST_DEFAULTS)
        return settings

    def modify_prefs(self, prefs):
        prefs.update(TEST_DEFAULT_PREFS)
        return prefs

    def test_override_defaults(self):
        for name, value in TEST_DEFAULTS.items():
            self.assertEqual(value, self.data_layer.get_setting(name))
        for name, value in TEST_DEFAULT_PREFS.items():
            if type(value) is int:
                self.assertEqual(value, self.data_layer.get_int_pref(name))
            elif type(value) is bool:
                self.assertEqual(value, self.data_layer.get_bool_pref(name))
            else:
                self.assertEqual(value, self.data_layer.get_char_pref(name))
