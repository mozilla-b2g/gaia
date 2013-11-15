# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.system.regions.cards_view import CardsView


class TestCardsViewThreeApps(GaiaTestCase):

    _test_apps = ["Clock", "Gallery", "Calendar"]

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.cards_view = CardsView(self.marionette)

        # Launch the test apps
        for app in self._test_apps:
            self.apps.launch(app)
            # We need to wait a bit so to not trip the OOM killer
            time.sleep(2)

    def test_kill_app_from_cards_view(self):
        # https://moztrap.mozilla.org/manage/case/1917/

        # Switch to top level frame before dispatching the event
        self.marionette.switch_to_frame()

        # Pull up the cards view
        self.cards_view.open_cards_view()

        # Close the current app from the cards view
        self.cards_view.close_app(self._test_apps[2])

        self.marionette.switch_to_frame()

        # Pull up the cards view again
        self.cards_view.open_cards_view()

        # If successfully killed, the app should no longer appear in the cards view.
        self.assertFalse(self.cards_view.is_app_present(self._test_apps[2]),
            "Killed app not expected to appear in cards view")

        # Check if the remaining 2 apps are visible in the cards view
        self.assertTrue(self.cards_view.is_app_displayed(self._test_apps[0]),
            "First opened app should be visible in cards view")

        self.assertTrue(self.cards_view.is_app_displayed(self._test_apps[1]),
            "Second app opened should be visible in cards view")
