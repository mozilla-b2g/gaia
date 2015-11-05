# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.system.regions.cards_view import CardsView
from gaiatest.apps.system.app import System


class TestCardsViewStatusbarVisibilityAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.apps.launch('Calendar')

        # Switch to top level frame before starting the test
        self.marionette.switch_to_frame()

    def test_a11y_cards_view_status_bar_visibility(self):

        cards_view = CardsView(self.marionette)
        status_bar = System(self.marionette).status_bar

        # Pull up the cards view
        self.device.hold_home_button()
        cards_view.wait_for_cards_view()

        # Wait for the app card ready
        cards_view.cards[0].wait_for_centered()

        # Statusbar icons should be invisible to the screen reader.
        self.wait_for_condition(lambda m: status_bar.is_status_bar_maximized_wrapper_a11y_hidden)
        self.wait_for_condition(lambda m: status_bar.is_status_bar_minimized_wrapper_a11y_hidden)
