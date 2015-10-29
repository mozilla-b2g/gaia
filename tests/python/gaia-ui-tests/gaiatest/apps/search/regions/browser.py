# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.apps.base import Base
from marionette_driver import expected, By, Wait


class Browser(Base):

    _browser_app_locator = (By.CSS_SELECTOR, 'div[data-manifest-name="Browser"][transition-state="opened"], div.browser[transition-state="opened"]')
    _browser_frame_locator = (By.CSS_SELECTOR, 'iframe.browser')

    _menu_button_locator = (By.CSS_SELECTOR, '.menu-button')
    _add_to_home_button_locator = (By.CSS_SELECTOR, 'button[data-id="add-to-homescreen"]')
    _share_button_locator = (By.CSS_SELECTOR, 'button[data-id="share"]')
    _share_to_messages_button_locator = (By.CSS_SELECTOR, 'button[data-manifest="app://sms.gaiamobile.org/manifest.webapp"]')
    _browser_menu_locator = (By.CSS_SELECTOR, '.contextmenu-list')

    _back_button_locator = (By.CSS_SELECTOR, '.back-button')
    _forward_button_locator = (By.CSS_SELECTOR, '.forward-button')
    _reload_button_locator = (By.CSS_SELECTOR, '.reload-button')

    _url_bar_locator = (By.CSS_SELECTOR, '.urlbar .title')

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
        return self._root_element.get_attribute('loading-state') == "true"

    def wait_for_page_to_start_loading(self):
        Wait(self.marionette).until(lambda m: self.is_page_loading)

    def wait_for_page_to_load(self, timeout=30):
        Wait(self.marionette, timeout).until(lambda m: not self.is_page_loading)

    def tap_menu_button(self):
        self._root_element.find_element(*self._menu_button_locator).tap()
        Wait(self.marionette).until(
            expected.element_displayed(*self._browser_menu_locator))

    def tap_add_to_home(self):
        element = self._root_element.find_element(*self._add_to_home_button_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        from gaiatest.apps.homescreen.regions.bookmark_menu import BookmarkMenu
        return BookmarkMenu(self.marionette)

    def tap_share(self):
        element = self._root_element.find_element(*self._share_button_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

    def tap_share_to_messages(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._share_to_messages_button_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        from gaiatest.apps.messages.regions.new_message import NewMessage
        return NewMessage(self.marionette)

    @property
    def url(self):
        return self._root_element.find_element(*self._browser_frame_locator).get_attribute('data-url')

    def tap_back_button(self):
        current_url = self.url
        self._root_element.find_element(*self._back_button_locator).tap()
        Wait(self.marionette).until(lambda m: self.url != current_url)

    def tap_forward_button(self):
        current_url = self.url
        self._root_element.find_element(*self._forward_button_locator).tap()
        Wait(self.marionette).until(lambda m: self.url != current_url)

    def tap_reload_button(self):
        button = self._root_element.find_element(*self._reload_button_locator)
        # when the page is loading, this button will not be visible
        Wait(self.marionette).until(expected.element_displayed(button))
        button.tap()

    def go_to_url(self, url):
        self._root_element.find_element(*self._url_bar_locator).tap()
        from gaiatest.apps.system.regions.search_panel import SearchPanel
        search_panel = SearchPanel(self.marionette)
        return search_panel.go_to_url(url)

class PrivateWindow(Browser):
    _browser_app_locator = (By.CSS_SELECTOR, 'div.private[data-manifest-name="Browser"][transition-state="opened"]')

    def __init__(self, marionette):
        Browser.__init__(self, marionette)
        # Workaround for bug 1204831 where the focus can be removed from the url bar when
        # the private browser is not ready with loading yet
        url_bar = self._root_element.find_element(*self._url_bar_locator)
        Wait(self.marionette).until(lambda m: url_bar.text != 'system.gaiamobile.org')
