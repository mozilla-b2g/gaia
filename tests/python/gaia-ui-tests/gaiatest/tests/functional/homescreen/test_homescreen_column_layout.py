# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.settings.app import Settings


class TestHomescreenLayout(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

    def test_homescreen_column_layout(self):
        """
        https://moztrap.mozilla.org/manage/case/13710/
        """

        self.homescreen.wait_for_number_of_apps(1)
        initial_number_of_columns = self.homescreen.number_of_columns
        self.assertEqual(3, initial_number_of_columns)

        settings = Settings(self.marionette)
        settings.launch()

        homescreen_settings = settings.open_homescreen()
        homescreen_settings.select_icon_layout('Four Columns')
        self.device.touch_home_button()

        Wait(self.marionette).until(lambda m: initial_number_of_columns != self.homescreen.number_of_columns)
        self.assertEqual(4, self.homescreen.number_of_columns)

        settings.launch()
        # No need to open homescreen setting again
        # because it remembers where it left off
        homescreen_settings.select_icon_layout('Four Columns')
        self.device.touch_home_button()

        self.assertEqual(4, self.homescreen.number_of_columns)
