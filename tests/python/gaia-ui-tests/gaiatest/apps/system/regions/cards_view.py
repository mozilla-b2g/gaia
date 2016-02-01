# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from marionette_driver.marionette import Actions

from gaiatest.apps.base import PageRegion


class CardsView(PageRegion):

    _root_locator = (By.ID, 'task-manager')
    _card_locator = (By.CSS_SELECTOR, '#cards-view .card')
    _cards_no_recent_windows_locator = (By.ID, 'cards-no-recent-windows')
    _new_private_sheet_locator = (By.ID, 'task-manager-new-private-sheet-button')
    _new_sheet_locator = (By.ID, 'task-manager-new-sheet-button')

    # Check that the origin contains the current app name, origin is in the format:
    # app://clock.gaiamobile.org
    # This locator is used by is_app_a11y_visible
    _apps_cards_locator = (By.CSS_SELECTOR, '#cards-view li[data-origin*="%s"]')

    def __init__(self, marionette):
        marionette.switch_to_frame()
        root = marionette.find_element(*self._root_locator)
        PageRegion.__init__(self, marionette, root)

    def open_new_browser(self):
        self.root_element.find_element(*self._new_sheet_locator).tap()
        self.wait_for_cards_view_not_displayed()
        from gaiatest.apps.search.app import Search
        return Search(self.marionette)

    def open_new_private_window(self):
        self.root_element.find_element(*self._new_private_sheet_locator).tap()
        self.wait_for_cards_view_not_displayed()
        from gaiatest.apps.search.regions.browser import PrivateWindow
        return PrivateWindow(self.marionette)

    @property
    def cards(self):
        return [Card(self.marionette, card)
                for card in self.root_element.find_elements(*self._card_locator)]

    @property
    def is_displayed(self):
        return self.is_element_displayed(*self._root_locator)

    @property
    def is_no_card_displayed(self):
        return (self.root_element.is_displayed() and
            self.root_element.find_element(*self._cards_no_recent_windows_locator).is_displayed())

    def wait_for_no_card_displayed(self):
        Wait(self.marionette).until(lambda m: self.is_no_card_displayed)

    @property
    def is_cards_view_a11y_hidden(self):
        return self.accessibility.is_hidden(self.root_element)

    def is_app_a11y_visible(self, app):
        return self.accessibility.is_visible(self.root_element.find_element(
            *self._app_cards_locator(app)))

    def is_app_a11y_hidden(self, app):
        return self.accessibility.is_hidden(self.root_element.find_element(
            *self._app_cards_locator(app)))

    def a11y_wheel_cards_view(self, direction):
        self.accessibility.wheel(self.root_element, direction)

    def wait_for_cards_view(self):
        Wait(self.marionette).until(
            lambda m: self.root_element.get_attribute('class') == 'active')

    def wait_for_cards_view_not_displayed(self):
        Wait(self.marionette).until(
            expected.element_not_displayed(self.root_element))

    def swipe_to_previous_app(self):
        current_frame = self.apps.displayed_app.frame

        final_x_position = current_frame.rect['width'] // 2
        start_y_position = current_frame.rect['height'] // 2

        # swipe forward to get previous app card
        Actions(self.marionette).flick(
            current_frame, 0, start_y_position, final_x_position, start_y_position).perform()


class Card(PageRegion):
    _close_button_locator = (By.CLASS_NAME, 'close-button')
    _screenshot_view_locator = (By.CLASS_NAME, 'screenshotView')
    _app_icon_locator = (By.CLASS_NAME, 'appIcon')
    _title_locator = (By.CLASS_NAME, 'title')
    _subtitle_locator = (By.CLASS_NAME, 'subtitle')
    _close_buttons_locator = (By.CSS_SELECTOR, '.close-button')

    @property
    def title(self):
        return self.root_element.find_element(*self._title_locator).text

    @property
    def subtitle(self):
        return self.root_element.find_element(*self._subtitle_locator).text

    @property
    def is_displayed(self):
        return self.root_element.is_displayed()

    @property
    def manifest_url(self):
        return self.root_element.get_attribute('data-origin')

    @property
    def is_centered(self):
        screen_width = int(self.marionette.execute_script('return window.innerWidth'))
        left = self.root_element.rect['x']
        width = self.root_element.rect['width']
        # center of card should be within 1px of viewport center
        return 1 >= abs(screen_width / 2 - (left + width / 2))

    def wait_for_centered(self):
        Wait(self.marionette).until(lambda m: self.is_centered)

    def tap(self):
        self.root_element.tap()

    def close(self):
        self.wait_for_centered()
        self.root_element.find_element(*self._close_button_locator).tap()

    def a11y_click_close_button(self):
        self.accessibility.click(self.root_element.find_element(*self._close_button_locator))

    def a11y_click_screenshot_view(self):
        self.accessibility.click(self.root_element.find_element(*self._screenshot_view_locator))

    def a11y_click_app_icon(self):
        self.accessibility.click(self.root_element.find_element(*self._app_icon_locator))
