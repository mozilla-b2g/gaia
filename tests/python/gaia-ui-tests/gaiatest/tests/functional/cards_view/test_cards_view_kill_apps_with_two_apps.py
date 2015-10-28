# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.system.regions.cards_view import CardsView
from gaiatest.apps.clock.app import Clock
from gaiatest.apps.gallery.app import Gallery


class TestCardsViewTwoApps(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.cards_view = CardsView(self.marionette)

        self.clock = Clock(self.marionette)
        self.clock.launch()
        self.gallery = Gallery(self.marionette)
        self.gallery.launch(empty=True)

    def test_kill_app_from_cards_view(self):
        """https://moztrap.mozilla.org/manage/case/1917/"""

        # Pull up the cards view
        self.device.hold_home_button()
        self.cards_view.wait_for_cards_view()

        # Wait for first app ready
        self.cards_view.cards[1].wait_for_centered()
        self.assertIn(self.cards_view.cards[1].manifest_url, self.gallery.manifest_url)

        # Close the current apps from the cards view
        self.cards_view.cards[1].close()
        self.cards_view.cards[0].close()

        # If successfully killed, the apps should no longer appear in the cards view and the "No recent apps" message should be displayed
        self.assertEqual(len(self.cards_view.cards), 0, 'Should have no cards to display')
