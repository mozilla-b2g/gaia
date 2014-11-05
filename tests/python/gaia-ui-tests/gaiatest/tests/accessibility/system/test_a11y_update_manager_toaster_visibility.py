# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.system.app import System


class TestUpdateManagerToasterVisibilityAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.system = System(self.marionette)

    def test_a11y_update_manager_toaster_visibility(self):

        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.system._update_manager_toaster_locator)))
