# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.errors import NoSuchElementException

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

    def test_kill_app_from_cards_view(self):
        # https://moztrap.mozilla.org/manage/case/1917/
        # go to the home screen
        self.marionette.switch_to_frame()
        self._touch_home_button()

        # pull up the cards view
        self._hold_home_button()
        self.wait_for_element_displayed(*self._cards_view_locator)

        # Find the close icon for the current app
        close_third_app_button = self.marionette.find_element(*self.test_apps[2]['close_button_locator'])
        close_third_app_button.tap()

        self.marionette.switch_to_frame()

        # pull up the cards view again
        self._hold_home_button()
        self.wait_for_element_displayed(*self._cards_view_locator)

        # If we successfully killed the app, we should no longer find the app
        # card inside cards view.
        self.assertRaises(NoSuchElementException,
                          self.marionette.find_element,
                          *self.test_apps[2]['card_locator'])

        # Check if the remaining 2 apps are visible in the cards view
        self.assertTrue(
            self.marionette.find_element(*self.test_apps[0]['card_locator']). is_displayed(),
            "First opened app should not be visible in cards view")

        self.assertTrue(
            self.marionette.find_element(*self.test_apps[1]['card_locator']). is_displayed(),
            "Second app opened should be visible in cards view")

    def _hold_home_button(self):
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('holdhome'));")

    def _touch_home_button(self):
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home'));")
