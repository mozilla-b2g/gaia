# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.system.regions.cards_view import CardsView


class TestCardsView(GaiaTestCase):

    _test_apps = ['Calendar', 'Clock']

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Launch the test apps
        for app in self._test_apps:
            self.apps.launch(app)

        # Switch to top level frame before starting the test
        self.marionette.switch_to_frame()

    def test_that_app_can_be_launched_from_cards_view(self):
        """https://moztrap.mozilla.org/manage/case/2462/"""

        cards_view = CardsView(self.marionette)
        self.assertFalse(cards_view.is_cards_view_displayed, 'Cards view not expected to be visible')

        # Pull up the cards view
        self.device.hold_home_button()
        cards_view.wait_for_cards_view()

        for app in self._test_apps:
            self.assertTrue(cards_view.is_app_displayed(app),
                            '%s app should be visible in cards view' % app)

        cards_view.swipe_to_next_app()
        cards_view.tap_app(self._test_apps[0])
        cards_view.wait_for_cards_view_not_displayed()

        self.assertEqual(self.apps.displayed_app.name, self._test_apps[0])
