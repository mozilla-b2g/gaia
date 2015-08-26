# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.marionette_test import parameterized

from gaiatest import GaiaTestCase


class TestWiFiMultipleConnect(GaiaTestCase):

    @parameterized("1st_run")
    @parameterized("2nd_run")
    # The second run is necessary to check for this regression bug to
    # occur, namely an unusable device, see bug 1190791.
    # Also, the 30 times repeat is necessary for that
    def test_connect_and_forget_all_networks(self):
        for x in range(0, 30):
            self.connect_to_local_area_network()
            self.disable_all_network_connections()
