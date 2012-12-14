# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase

class TestCardsView(GaiaTestCase):

    # Home/Cards view locators
    _cards_view_locator = ('id', 'cards-view')
    _calculator_card_locator = ('xpath', "//li[@class='card']/h1[text()='Calculator']")

    # Calculator locators
    _clear_button_locator = ('xpath', "//input[@value='C']")

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the Calculator app as a basic, reliable
        # app to test against in Cards View
        self.calculator = self.apps.launch('Calculator')

        # wait for the Calculator to load
        self.wait_for_element_displayed(*self._clear_button_locator)

    def test_cards_view(self):

        # switch to top level frame before dispatching the event
        self.marionette.switch_to_frame()

        card_view_element = self.marionette.find_element(*self._cards_view_locator)
        self.assertFalse(card_view_element.is_displayed(),
            "Card view not expected to be visible")

        self._hold_home_button()
        self.wait_for_element_displayed(*self._cards_view_locator)

        self.assertTrue(card_view_element.is_displayed(),
            "Card view expected to be visible")

        calculator_card = self.marionette.find_element(*self._calculator_card_locator)
        self.assertTrue(calculator_card.is_displayed())

        self._touch_home_button()
        self.wait_for_element_not_displayed(*self._cards_view_locator)

        self.assertFalse(card_view_element.is_displayed(),
            "Card view not expected to be visible")

    def test_that_app_can_be_launched_from_cards_view(self):
        # https://github.com/mozilla/gaia-ui-tests/issues/98

        # go to the home screen
        self.marionette.switch_to_frame()
        self._touch_home_button()
        self.wait_for_element_not_displayed(*self._clear_button_locator)

        # pull up the cards view
        self.marionette.switch_to_frame()
        self._hold_home_button()
        self.wait_for_element_displayed(*self._cards_view_locator)

        # launch the calculator from the cards view
        calc_card = self.marionette.find_element(*self._calculator_card_locator)
        calc_card.click()
        self.marionette.switch_to_frame(self.calculator.frame_id)
        self.wait_for_element_displayed(*self._clear_button_locator)

    def _hold_home_button(self):
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('holdhome'));")

    def _touch_home_button(self):
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home'));")

    def tearDown(self):

        # close the app
        if hasattr(self, 'calculator'):
            self.apps.kill(self.calculator)

        GaiaTestCase.tearDown(self)
