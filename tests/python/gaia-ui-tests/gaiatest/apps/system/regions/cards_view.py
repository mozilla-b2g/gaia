# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait
from marionette_driver.marionette import Actions

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class CardsView(Base):

    # Home/Cards view locators
    _cards_view_locator = (By.ID, 'cards-view')
    _cards_locator = (By.CSS_SELECTOR, '#cards-view .card')
    # Check that the origin contains the current app name, origin is in the format:
    # app://clock.gaiamobile.org
    _apps_cards_locator = (By.CSS_SELECTOR, '#cards-view li[data-origin*="%s"]')
    _close_buttons_locator = (By.CSS_SELECTOR, '#cards-view li[data-origin*="%s"] .close-button')

    def _app_card_locator(self, app):
        return (self._apps_cards_locator[0], self._apps_cards_locator[1] % app.lower().replace('-', ''))

    def _close_button_locator(self, app):
        return (self._close_buttons_locator[0], self._close_buttons_locator[1] % app.lower().replace('-', ''))

    @property
    def cards(self):
        return [Card(self.marionette, card)
                for card in self.marionette.find_elements(*self._cards_locator)]

    @property
    def is_cards_view_displayed(self):
        return self.is_element_displayed(*self._cards_view_locator)

    @property
    def is_cards_view_a11y_hidden(self):
        return self.accessibility.is_hidden(self.marionette.find_element(
            *self._cards_view_locator))

    def _card_is_centered(self, card):
        screen_width = int(self.marionette.execute_script('return window.innerWidth'))
        left = card.location['x']
        width = card.size['width']
        # center of card should be within 1px of viewport center
        return 1 >= abs(screen_width / 2 - (left + width / 2))

    def wait_for_card_ready(self, app):
        card = self.marionette.find_element(*self._app_card_locator(app))
        Wait(self.marionette).until(lambda m: self._card_is_centered(card))

        # TODO: Remove sleep when we find a better wait
        time.sleep(0.2)

    def is_app_displayed(self, app):
        return self.is_element_displayed(*self._app_card_locator(app))

    def is_app_a11y_visible(self, app):
        return self.accessibility.is_visible(self.marionette.find_element(
            *self._app_card_locator(app)))

    def is_app_a11y_hidden(self, app):
        return self.accessibility.is_hidden(self.marionette.find_element(
            *self._app_card_locator(app)))

    def a11y_wheel_cards_view(self, direction):
        self.accessibility.wheel(self.marionette.find_element(*self._cards_view_locator), direction)

    def is_app_present(self, app):
        return self.is_element_present(*self._app_card_locator(app))

    def tap_app(self, app):
        Wait(self.marionette).until(lambda m: self.is_app_displayed(app))
        self.marionette.find_element(*self._app_card_locator(app)).tap()

    def close_app(self, app):
        self.wait_for_card_ready(app)
        Wait(self.marionette).until(
            expected.element_present(*self._app_card_locator(app)))
        self.marionette.find_element(*self._close_button_locator(app)).tap()
        Wait(self.marionette).until(
            expected.element_not_present(*self._app_card_locator(app)))

    def wait_for_cards_view(self):
        cards_view = self.marionette.find_element(*self._cards_view_locator)
        Wait(self.marionette).until(
            lambda m: cards_view.get_attribute('class') == 'active')

    def wait_for_cards_view_not_displayed(self):
        Wait(self.marionette).until(
            expected.element_not_displayed(*self._cards_view_locator))

    def swipe_to_previous_app(self):
        current_frame = self.apps.displayed_app.frame

        start_x_position = current_frame.size['width']
        final_x_position = start_x_position * 2
        start_y_position = current_frame.size['height'] // 2

        # swipe forward to get previous app card
        Actions(self.marionette).flick(
            current_frame, start_x_position, start_y_position, final_x_position, start_y_position).perform()


class Card(PageRegion):
    _close_button_locator = (By.CLASS_NAME, 'close-button')
    _screenshot_view_locator = (By.CLASS_NAME, 'screenshotView')
    _app_icon_locator = (By.CLASS_NAME, 'appIcon')

    def a11y_click_close_button(self):
        self.accessibility.click(self.root_element.find_element(*self._close_button_locator))

    def a11y_click_screenshot_view(self):
        self.accessibility.click(self.root_element.find_element(*self._screenshot_view_locator))

    def a11y_click_app_icon(self):
        self.accessibility.click(self.root_element.find_element(*self._app_icon_locator))
