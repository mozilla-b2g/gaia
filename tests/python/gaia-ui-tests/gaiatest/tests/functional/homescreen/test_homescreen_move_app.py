# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestMoveApp(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

    def test_move_app_position(self):
        """
        https://moztrap.mozilla.org/manage/case/1317/
        """

        self.homescreen.wait_for_number_of_apps(1)
        first_app_before_move = self.homescreen.visible_apps[0].manifest_url
        self.homescreen.move_app_to_position(0, 2)

        first_app_after_move = self.homescreen.visible_apps[0].manifest_url
        self.assertNotEqual(first_app_before_move, first_app_after_move)
        self.assertEqual(first_app_before_move, self.homescreen.visible_apps[2].manifest_url)
