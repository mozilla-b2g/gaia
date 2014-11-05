# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.apps.base import Base
from marionette.by import By


class Browser(Base):

    _browser_app_locator = (By.CSS_SELECTOR, 'div.browser[transition-state="opened"]')
    _browser_frame_locator = (By.CSS_SELECTOR, 'iframe.browser')

    _menu_button_locator = (By.CSS_SELECTOR, '.menu-button')
    _add_to_home_button_locator = (By.CSS_SELECTOR, 'button[data-id="add-to-homescreen"]')
    _share_button_locator = (By.CSS_SELECTOR, 'button[data-id="share"]')
    _share_to_messages_button_locator = (By.CSS_SELECTOR, 'button[data-value="1"]')
    _browser_menu_locator = (By.CSS_SELECTOR, '.contextmenu-list')

    _back_button_locator = (By.CSS_SELECTOR, '.back-button')
    _forward_button_locator = (By.CSS_SELECTOR, '.forward-button')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.marionette.switch_to_frame()
        self._root_element = self.marionette.find_element(*self._browser_app_locator)

    def switch_to_content(self):
        web_frame = self._root_element.find_element(*self._browser_frame_locator)
        self.marionette.switch_to_frame(web_frame)

    def switch_to_chrome(self):
        self.marionette.switch_to_frame()

    @property
    def is_page_loading(self):
        return "loading" in self._root_element.value_of_css_property('class')

    def wait_for_page_to_load(self, timeout=30):
        self.wait_for_condition(lambda m: not self.is_page_loading, timeout=timeout)

    def tap_menu_button(self):
        self._root_element.find_element(*self._menu_button_locator).tap()
        self.wait_for_element_displayed(*self._browser_menu_locator)

    def tap_add_to_home(self):
        self.wait_for_element_displayed(*self._add_to_home_button_locator)
        self._root_element.find_element(*self._add_to_home_button_locator).tap()
        from gaiatest.apps.homescreen.regions.bookmark_menu import BookmarkMenu

        return BookmarkMenu(self.marionette)

    def tap_share(self):
        self.wait_for_element_displayed(*self._share_button_locator)
        self._root_element.find_element(*self._share_button_locator).tap()

    def tap_share_to_messages(self):
        self.wait_for_element_displayed(*self._share_to_messages_button_locator)
        self.marionette.find_element(*self._share_to_messages_button_locator).tap()

        from gaiatest.apps.messages.regions.new_message import NewMessage
        return NewMessage(self.marionette)

    @property
    def url(self):
        return self._root_element.find_element(*self._browser_frame_locator).get_attribute('data-url')

    def tap_back_button(self):
        current_url = self.url
        self._root_element.find_element(*self._back_button_locator).tap()
        self.wait_for_condition(lambda m: self.url != current_url)

    def tap_forward_button(self):
        current_url = self.url
        self._root_element.find_element(*self._forward_button_locator).tap()
        self.wait_for_condition(lambda m: self.url != current_url)
