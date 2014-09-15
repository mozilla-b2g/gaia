# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.ftu.app import Ftu
from gaiatest.apps.homescreen.app import Homescreen


class TestFtu(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.ftu = Ftu(self.marionette)
        self.ftu.launch()

    def test_ftu_with_tour(self):

        # Go through the FTU setup as quickly as possible to get to the Tour section
        self.ftu.run_ftu_setup_with_default_values()

        # Take the tour
        self.ftu.tap_take_tour()

        # Walk through the tour
        self.assertEqual(self.ftu.step1_header_text, "Swipe up and down to browse your apps and bookmarks. Tap and hold an icon to delete, move, or edit it.")
        self.ftu.tap_tour_next()
        self.assertEqual(self.ftu.step2_header_text, "Swipe down to access recent notifications, credit information and settings.")
        self.ftu.tap_tour_next()
        self.assertEqual(self.ftu.step3_header_text, "Drag from the left edge of your screen to return to recently used apps.")
        self.ftu.tap_tour_next()
        self.assertEqual(self.ftu.step4_header_text, "Tap on the search box anytime to start a search or go to a website.")

        # Try going back a step
        self.ftu.tap_back()
        self.assertEqual(self.ftu.step3_header_text, "Drag from the left edge of your screen to return to recently used apps.")
        self.ftu.tap_tour_next()
        self.assertEqual(self.ftu.step4_header_text, "Tap on the search box anytime to start a search or go to a website.")
        self.ftu.tap_tour_next()
        self.ftu.wait_for_finish_tutorial_section()
        self.ftu.tap_lets_go_button()

        # Switch back to top level now that FTU app is gone
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == Homescreen.name)
