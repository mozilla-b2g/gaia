# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.system.regions.cards_view import CardsView


class TestCardsViewAccessibility(GaiaTestCase):

    _test_apps = ['Calendar', 'Settings', 'Clock']

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Launch the test apps
        for app in self._test_apps:
            self.apps.launch(app, switch_to_frame=False)

        # Switch to top level frame before starting the test
        self.marionette.switch_to_frame()

    def test_a11y_cards_view(self):

        cards_view = CardsView(self.marionette)
        self.assertTrue(cards_view.is_cards_view_a11y_hidden,
                        'Cards view should not be visible to the screen reader')

        # Pull up the cards view
        self.device.hold_home_button()
        cards_view.wait_for_cards_view()

        # Wait for first app ready
        cards_view.wait_for_card_ready(self._test_apps[2])

        # Only current card should be visible
        self.assertTrue(cards_view.is_app_a11y_visible(self._test_apps[2]))
        self.assertTrue(cards_view.is_app_a11y_hidden(self._test_apps[1]))
        self.assertTrue(cards_view.is_app_a11y_hidden(self._test_apps[0]))

        # Swipe with two fingers right and left and verify card visibility
        cards_view.a11y_wheel_cards_view('right')
        self.assertTrue(cards_view.is_app_a11y_hidden(self._test_apps[2]))
        self.assertTrue(cards_view.is_app_a11y_visible(self._test_apps[1]))
        self.assertTrue(cards_view.is_app_a11y_hidden(self._test_apps[0]))

        cards_view.a11y_wheel_cards_view('right')
        self.assertTrue(cards_view.is_app_a11y_hidden(self._test_apps[2]))
        self.assertTrue(cards_view.is_app_a11y_hidden(self._test_apps[1]))
        self.assertTrue(cards_view.is_app_a11y_visible(self._test_apps[0]))

        # Swipe again even though there's nowhere to swipe to make sure the
        # state does not break
        cards_view.a11y_wheel_cards_view('right')
        self.assertTrue(cards_view.is_app_a11y_hidden(self._test_apps[2]))
        self.assertTrue(cards_view.is_app_a11y_hidden(self._test_apps[1]))
        self.assertTrue(cards_view.is_app_a11y_visible(self._test_apps[0]))

        cards_view.a11y_wheel_cards_view('left')
        self.assertTrue(cards_view.is_app_a11y_hidden(self._test_apps[2]))
        self.assertTrue(cards_view.is_app_a11y_visible(self._test_apps[1]))
        self.assertTrue(cards_view.is_app_a11y_hidden(self._test_apps[0]))

        cards_view.a11y_wheel_cards_view('left')
        self.assertTrue(cards_view.is_app_a11y_visible(self._test_apps[2]))
        self.assertTrue(cards_view.is_app_a11y_hidden(self._test_apps[1]))
        self.assertTrue(cards_view.is_app_a11y_hidden(self._test_apps[0]))

        # Swipe again even though there's nowhere to swipe to make sure the
        # state does not break
        cards_view.a11y_wheel_cards_view('left')
        self.assertTrue(cards_view.is_app_a11y_visible(self._test_apps[2]))
        self.assertTrue(cards_view.is_app_a11y_hidden(self._test_apps[1]))
        self.assertTrue(cards_view.is_app_a11y_hidden(self._test_apps[0]))

        # Assert there are 3 cards
        self.assertEqual(3, len(cards_view.cards), 'Expected 3 cards')

        # Remove a card by swiping with 2 fingers up
        cards_view.a11y_wheel_cards_view('up')

        # Assert there are 2 cards
        cards = cards_view.cards
        self.assertEqual(2, len(cards), 'Expected 2 cards')
        self.assertTrue(cards_view.is_app_a11y_visible(self._test_apps[1]))
        self.assertTrue(cards_view.is_app_a11y_hidden(self._test_apps[0]))

        # Remove a card by clicking its close button
        cards[1].a11y_click_close_button()

        # Assert there is 1 card
        cards = cards_view.cards
        self.assertEqual(1, len(cards), 'Expected 1 card')
        self.assertTrue(cards_view.is_app_a11y_visible(self._test_apps[0]))

        # Open an app by clicking its icon
        cards[0].a11y_click_app_icon()
        cards_view.wait_for_cards_view_not_displayed()
        self.assertEqual(self.apps.displayed_app.name, self._test_apps[0])

        # Switch to top level frame and reopen cards view
        self.marionette.switch_to_frame()
        self.device.hold_home_button()
        cards_view.wait_for_cards_view()
        cards_view.wait_for_card_ready(self._test_apps[0])

        # Assert there is 1 card
        cards = cards_view.cards
        self.assertEqual(1, len(cards), 'Expected 1 card')

        # Open an app by clicking its screenshot view
        cards[0].a11y_click_screenshot_view()
        cards_view.wait_for_cards_view_not_displayed()
        self.assertEqual(self.apps.displayed_app.name, self._test_apps[0])
