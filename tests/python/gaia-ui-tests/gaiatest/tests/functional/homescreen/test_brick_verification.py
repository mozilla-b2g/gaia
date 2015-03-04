# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestBrickVerification(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.homescreen = Homescreen(self.marionette)

    def test_verify_homescreen(self):
        self.apps.switch_to_displayed_app()
        self.assertTrue(self.homescreen.is_homescreen_visible, "The phone seems to be bricked.")