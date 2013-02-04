# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase

from marionette.errors import NoSuchElementException


class TestCardsView(GaiaTestCase):

    _app_under_test = "Clock"

    # Home/Cards view locators
    _cards_view_locator = ('id', 'cards-view')
    # Check that the origin contains the current app name, origin is in the format:
    # app://clock.gaiamobile.org
    _app_card_locator = ('css selector', '#cards-view li[data-origin*="%s"]' % _app_under_test.lower())
    _close_button_locator = ('css selector', '#cards-view li[data-origin*="%s"] .close-card' % _app_under_test.lower())
    _clock_frame_locator = ('css selector', "iframe[mozapp='app://clock.gaiamobile.org/manifest.webapp']")

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the Clock app as a basic, reliable
        # app to test against in Cards View
        self.app = self.apps.launch(self._app_under_test)

    def test_cards_view(self):
        # https://moztrap.mozilla.org/manage/case/1909/
        # switch to top level frame before dispatching the event
        self.marionette.switch_to_frame()

        card_view_element = self.marionette.find_element(*self._cards_view_locator)
        self.assertFalse(card_view_element.is_displayed(),
                         "Card view not expected to be visible")

        self._hold_home_button()
        self.wait_for_element_displayed(*self._cards_view_locator)

        self.assertTrue(card_view_element.is_displayed(),
                        "Card view expected to be visible")

        app_card = self.marionette.find_element(*self._app_card_locator)
        self.assertTrue(app_card.is_displayed())

        self._touch_home_button()
        self.wait_for_element_not_displayed(*self._cards_view_locator)

        self.assertFalse(card_view_element.is_displayed(),
                         "Card view not expected to be visible")

    def test_that_app_can_be_launched_from_cards_view(self):
        # https://github.com/mozilla/gaia-ui-tests/issues/98

        # go to the home screen
        self.marionette.switch_to_frame()
        self._touch_home_button()

        # find the cards frame htmlelement
        clock_frame = self.marionette.find_element(*self._clock_frame_locator)

        # pull up the cards view
        self._hold_home_button()
        self.wait_for_element_displayed(*self._cards_view_locator)

        self.assertFalse(clock_frame.is_displayed(),
            "Clock frame expected to be not displayed but was")

        # launch the app from the cards view
        app_card = self.marionette.find_element(*self._app_card_locator)
        self.marionette.tap(app_card)

        self.wait_for_element_not_displayed(*self._app_card_locator)

        self.assertTrue(clock_frame.is_displayed(),
            "Clock frame was expected to be displayed but was not")

    def test_kill_app_from_cards_view(self):
        # https://moztrap.mozilla.org/manage/case/1917/
        # go to the home screen
        self.marionette.switch_to_frame()
        self._touch_home_button()

        # pull up the cards view
        self._hold_home_button()
        self.wait_for_element_displayed(*self._cards_view_locator)

        # Find the close icon for the current app
        close_button = self.marionette.find_element(*self._close_button_locator)
        self.marionette.tap(close_button)

        self.marionette.switch_to_frame()

        # pull up the cards view again
        self._hold_home_button()
        self.wait_for_element_displayed(*self._cards_view_locator)

        # If we successfully killed the app, we should no longer find the app
        # card inside cards view.
        self.assertRaises(NoSuchElementException, self.marionette.find_element,
                *self._app_card_locator)

    def _hold_home_button(self):
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('holdhome'));")

    def _touch_home_button(self):
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home'));")
