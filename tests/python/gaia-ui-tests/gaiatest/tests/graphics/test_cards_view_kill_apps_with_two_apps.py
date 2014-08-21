# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from gaiatest.apps.system.regions.cards_view import CardsView
from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase

class TestCardsViewTwoApps(GaiaImageCompareTestCase):

    _test_apps = ["Contacts", "Gallery"]

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)
        self.cards_view = CardsView(self.marionette)

        # Launch the test apps
        for app in self._test_apps:
            self.apps.launch(app)
            # Let's wait a bit for the app to fully launch
            time.sleep(2)

    def test_kill_app_from_cards_view(self):
        """https://moztrap.mozilla.org/manage/case/1917/"""

        # Pull up the cards view
        self.device.hold_home_button()
        self.cards_view.wait_for_cards_view()

        # Wait for first app ready
        self.cards_view.wait_for_card_ready(self._test_apps[1])
        self.invoke_screen_capture()

        # Close the current apps from the cards view
        self.cards_view.close_app(self._test_apps[1])
        self.invoke_screen_capture()
        self.cards_view.close_app(self._test_apps[0])
        self.invoke_screen_capture()

        # If successfully killed, the apps should no longer appear in the cards view and the "No recent apps" message should be displayed
        self.assertFalse(self.cards_view.is_app_present(self._test_apps[1]),
                         "Killed app not expected to appear in cards view")

        self.assertFalse(self.cards_view.is_app_present(self._test_apps[0]),
                         "Killed app not expected to appear in cards view")

    def tearDown(self):

        GaiaImageCompareTestCase.tearDown(self)