# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.system.regions.cards_view import CardsView
from gaiatest.apps.settings.app import Settings
from gaiatest.apps.clock.app import Clock
from gaiatest.apps.gallery.app import Gallery


class TestCardsViewThreeApps(GaiaTestCase):

    _test_apps = []

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.cards_view = CardsView(self.marionette)

        self._test_apps.append(Clock(self.marionette))
        self._test_apps.append(Gallery(self.marionette))
        self._test_apps.append(Settings(self.marionette))

        # Launch the test apps
        for app in self._test_apps:
            app.launch()
            time.sleep(2)

    def test_cards_view(self):
        # https://moztrap.mozilla.org/manage/case/1909/

        # Switch to top level frame before dispatching the event
        self.marionette.switch_to_frame()

        self.assertFalse(self.cards_view.is_cards_view_displayed, "Cards view not expected to be visible")

        # Pull up the cards view
        self.cards_view.open_cards_view()

        self.assertFalse(self.cards_view.is_app_displayed(self._test_apps[0].name),
            "First opened app should not be visible in cards view")

        self.assertTrue(self.cards_view.is_app_displayed(self._test_apps[1].name),
            "Second app opened should be visible in cards view")

        self.assertTrue(self.cards_view.is_app_displayed(self._test_apps[2].name),
            "Third app opened should be visible in cards view")

        self.cards_view.exit_cards_view()
