# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from marionette.by import By
from gaiatest.apps.base import Base


class CardsView(Base):

    # Home/Cards view locators
    _cards_view_locator = (By.CSS_SELECTOR, '#cards-view.active')
    _no_apps_locator = (By.CSS_SELECTOR, '.no-recent-apps')
    # Check that the origin contains the current app name, origin is in the format:
    # app://clock.gaiamobile.org
    _apps_cards_locator = (By.CSS_SELECTOR, '#cards-view li[data-origin*="%s"]')
    _close_buttons_locator = (By.CSS_SELECTOR, '#cards-view li[data-origin*="%s"] .close-card')

    def _app_card_locator(self, app):
        return (self._apps_cards_locator[0], self._apps_cards_locator[1] % app.lower())

    def _close_button_locator(self, app):
        return (self._close_buttons_locator[0], self._close_buttons_locator[1] % app.lower())

    def open_cards_view(self):
        # Hold the home button to open cards view
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('holdhome'));")
        time.sleep(1)
        self.wait_for_cards_view()

    def exit_cards_view(self):
        # Touch the home button to exit cards view
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home'));")
        self.wait_for_cards_view_not_displayed()

    @property
    def is_cards_view_displayed(self):
        return self.is_element_displayed(*self._cards_view_locator)

    def is_app_displayed(self, app):
        return self.marionette.find_element(*self._app_card_locator(app)).is_displayed()

    def is_app_present(self, app):
        return self.is_element_present(*self._app_card_locator(app))

    def tap_app(self, app):
        return self.marionette.find_element(*self._app_card_locator(app)).tap()

    def close_app(self, app):
        return self.marionette.find_element(*self._close_button_locator(app)).tap()

    def wait_for_cards_view(self):
        self.wait_for_element_displayed(*self._cards_view_locator)

    def wait_for_cards_view_not_displayed(self):
        self.wait_for_element_not_displayed(*self._cards_view_locator)

    @property
    def no_recent_apps_message(self):
        return self.marionette.find_element(*self._no_apps_locator).text
