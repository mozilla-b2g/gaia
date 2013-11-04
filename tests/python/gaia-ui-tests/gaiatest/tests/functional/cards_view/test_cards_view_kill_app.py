# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.system.regions.cards_view import CardsView


class TestCardsView(GaiaTestCase):

    _app_under_test = "Clock"

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.cards_view = CardsView(self.marionette)

        # Launch the Clock app as a basic, reliable
        # app to test against in Cards View
        self.app = self.apps.launch(self._app_under_test)

    def test_kill_app_from_cards_view(self):
        # https://moztrap.mozilla.org/manage/case/1917/
        # Switch to top level frame before dispatching the event
        self.marionette.switch_to_frame()

        # Pull up the cards view
        self.cards_view.open_cards_view()

        # Close the current app from cards view
        self.cards_view.close_app(self._app_under_test)

        self.marionette.switch_to_frame()

        # Pull up the cards view again
        self.cards_view.open_cards_view()

        # If successfully killed, the app should no longer appear in the cards view.
        self.assertFalse(self.cards_view.is_app_present(self._app_under_test),
                         "Killed app not expected to appear in cards view")
