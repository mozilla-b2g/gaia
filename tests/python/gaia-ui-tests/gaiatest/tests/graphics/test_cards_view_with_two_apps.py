# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.apps.system.regions.cards_view import CardsView
from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
import sys

class TestCardsView(GaiaImageCompareTestCase):

    _test_apps = ['Contacts', 'Gallery']

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)
  
        self.invoke_screen_capture()

        # Launch the test apps
        for app in self._test_apps:
            self.apps.launch(app)

        # Switch to top level frame before starting the test
        self.marionette.switch_to_frame()


    def test_that_app_can_be_launched_from_cards_view(self):
        """https://moztrap.mozilla.org/manage/case/2462/"""

        cards_view = CardsView(self.marionette)
        self.assertFalse(cards_view.is_cards_view_displayed, 'Cards view not expected to be visible')
        self.invoke_screen_capture()

        # Pull up the cards view
        self.device.hold_home_button()
        cards_view.wait_for_cards_view()
        card_frame = self.marionette.get_active_frame()
        self.invoke_screen_capture()

        # Wait for first app ready
        cards_view.wait_for_card_ready(self._test_apps[1])

        for app in self._test_apps:
            self.assertTrue(cards_view.is_app_displayed(app),
                            '%s app should be present in cards view' % app)
        cards_view.swipe_to_previous_app()

        # Wait for previous app ready
        cards_view.wait_for_card_ready(self._test_apps[0])
        self.invoke_screen_capture()
        self.marionette.switch_to_frame(frame=card_frame)

        cards_view.tap_app(self._test_apps[0])

        cards_view.wait_for_cards_view_not_displayed()
        self.invoke_screen_capture()

        self.assertEqual(self.apps.displayed_app.name, self._test_apps[0])

    def tearDown(self):

        GaiaImageCompareTestCase.tearDown(self)