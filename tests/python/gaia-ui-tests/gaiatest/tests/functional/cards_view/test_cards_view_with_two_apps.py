# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.system.regions.cards_view import CardsView
from gaiatest.apps.clock.app import Clock
from gaiatest.apps.calendar.app import Calendar


class TestCardsView(GaiaTestCase):


    def setUp(self):
        GaiaTestCase.setUp(self)

        self.calendar = Calendar(self.marionette)
        self.calendar.launch()
        self.clock = Clock(self.marionette)
        self.clock.launch()

        # Switch to top level frame before starting the test
        self.marionette.switch_to_frame()

    def test_that_app_can_be_launched_from_cards_view(self):
        """
        https://moztrap.mozilla.org/manage/case/2462/
        """

        cards_view = CardsView(self.marionette)
        self.assertFalse(cards_view.is_displayed, 'Cards view not expected to be visible')

        # Pull up the cards view
        self.device.hold_home_button()
        cards_view.wait_for_cards_view()

        # Wait for first app ready
        cards_view.cards[1].wait_for_centered()

        self.assertIn(cards_view.cards[0].manifest_url, self.calendar.manifest_url)
        self.assertTrue(cards_view.cards[0].is_displayed,
                            '%s app should be present in cards view' % cards_view.cards[1].title)
        self.assertIn(cards_view.cards[1].manifest_url, self.clock.manifest_url)
        self.assertTrue(cards_view.cards[1].is_displayed,
                            '%s app should be present in cards view' % cards_view.cards[1].title)

        cards_view.swipe_to_previous_app()

        # Wait for previous app ready
        cards_view.cards[0].wait_for_centered()
        cards_view.cards[0].tap()

        cards_view.wait_for_cards_view_not_displayed()

        self.calendar.wait_to_be_displayed()
