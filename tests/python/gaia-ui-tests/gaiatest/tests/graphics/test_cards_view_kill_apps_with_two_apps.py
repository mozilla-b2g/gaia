# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest.apps.system.regions.cards_view import CardsView
from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.contacts.app import Contacts
from gaiatest.apps.gallery.app import Gallery


class TestCardsViewTwoApps(GaiaImageCompareTestCase):

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)
        self.cards_view = CardsView(self.marionette)

        self.contacts = Contacts(self.marionette)
        self.contacts.launch()
        self.gallery = Gallery(self.marionette)
        self.gallery.launch(empty=True)

        # 10 seconds for the actual user using the app a bit, and going back to homescreen
        time.sleep(10)
        self.device.touch_home_button()

    def test_cards_view_kill_apps_with_two_apps(self):
        """https://moztrap.mozilla.org/manage/case/1917/"""

        # Pull up the cards view
        self.device.hold_home_button()
        self.cards_view.wait_for_cards_view()

        # Wait for first app ready
        self.cards_view.cards[1].wait_for_centered()
        self.take_screenshot(top_frame=True)

        # Close the current apps from the cards view
        self.cards_view.cards[1].close()
        self.cards_view.cards[0].wait_for_centered()
        self.take_screenshot(top_frame=True)
        self.cards_view.cards[0].close()
        self.cards_view.wait_for_cards_view_not_displayed()
        self.take_screenshot(top_frame=True)

        # If successfully killed, the apps should no longer appear in the cards view
        # and the "No recent apps" message should be displayed
        self.device.hold_home_button()
        self.cards_view.wait_for_no_card_displayed()
        self.take_screenshot(top_frame=True)
        self.assertEqual(len(self.cards_view.cards), 0)
        self.assertTrue(self.cards_view.is_no_card_displayed)
