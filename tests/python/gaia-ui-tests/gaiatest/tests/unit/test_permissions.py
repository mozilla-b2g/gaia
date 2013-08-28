# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestPermissions(GaiaTestCase):

    def test_get_and_set_permission(self):

        for permission in ['deny', 'allow', 'prompt']:
            self.apps.set_permission('Camera', 'geolocation', permission)
            self.assertEqual(self.apps.get_permission('Camera', 'geolocation'), permission)
