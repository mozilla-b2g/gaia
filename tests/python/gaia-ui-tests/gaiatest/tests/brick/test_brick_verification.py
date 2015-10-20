# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestBrickVerification(GaiaTestCase):

    def test_verify_phone_not_bricked(self):
        Homescreen(self.marionette).wait_to_be_displayed()
