# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase

TEST_DEFAULTS = {'ftu.manifestURL': 'app://ftu.gaiamobile.org/manifest.webapp'}


class TestOverrideDefaults(GaiaTestCase):

    def modify_settings(self, settings):
        settings.update(TEST_DEFAULTS)
        return settings

    def test_override_defaults(self):
        for name, value in TEST_DEFAULTS.items():
            self.assertEqual(value, self.data_layer.get_setting(name))
