# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase


class TestCardsViewThreeApps(GaiaTestCase):

    _test_apps = ["Clock", "Gallery", "Calendar"]

    # Home/Cards view locators
    _cards_view_locator = (By.ID, 'cards-view')
    # Check that the origin contains the current app name, origin is in the format:
    # app://clock.gaiamobile.org
    _app_card_locator = (By.CSS_SELECTOR, '#cards-view li.card[data-origin*="%s"]')
    _close_button_locator = (By.CSS_SELECTOR, '#cards-view li.card[data-origin*="%s"] .close-card')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the test apps
        self.test_apps = []
        for app in self._test_apps:
            test_app = {
                'name': app,
                'app': self.apps.launch(app),
                'card_locator': (self._app_card_locator[0], self._app_card_locator[1] % app.lower()),
                'close_button_locator': (self._close_button_locator[0], self._close_button_locator[1] % app.lower())
            }
            self.test_apps.append(test_app)

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

        self.assertFalse(
            self.marionette.find_element(*self.test_apps[0]['card_locator']). is_displayed(),
            "First opened app should not be visible in cards view")

        self.assertTrue(
            self.marionette.find_element(*self.test_apps[1]['card_locator']). is_displayed(),
            "Second app opened should be visible in cards view")

        self.assertTrue(
            self.marionette.find_element(*self.test_apps[2]['card_locator']). is_displayed(),
            "Third app opened should be visible in cards view")

        self._touch_home_button()
        self.wait_for_element_not_displayed(*self._cards_view_locator)

        self.assertFalse(card_view_element.is_displayed(),
                         "Card view not expected to be visible")

    def _hold_home_button(self):
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('holdhome'));")

    def _touch_home_button(self):
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home'));")
