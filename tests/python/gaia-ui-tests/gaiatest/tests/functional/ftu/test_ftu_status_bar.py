# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.ftu.app import Ftu
from gaiatest.apps.system.app import System


class TestFtu(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.ftu = Ftu(self.marionette)
        self.ftu.launch()

    def test_ftu_status_bar(self):
        """
        https://moztrap.mozilla.org/manage/cases/?filter-id=6119
        See also test_ftu_skip_tour.py for the other checks in this test case
        """

        status_bar = System(self.marionette).status_bar

        while not self.ftu.is_take_tour_button_visible:
            self.marionette.switch_to_frame()
            self.assertTrue(status_bar.is_displayed)
            self.apps.switch_to_displayed_app()
            self.ftu.tap_next()

        self.ftu.tap_take_tour()

        while not self.ftu.is_lets_go_button_visible:
            self.marionette.switch_to_frame()
            self.assertTrue(status_bar.is_displayed)
            self.apps.switch_to_displayed_app()
            self.ftu.tap_tour_next()
