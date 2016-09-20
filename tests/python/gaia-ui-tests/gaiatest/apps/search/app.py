# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.apps.base import Base
from marionette_driver import expected, By, Wait


class BrowserBase(Base):

    name = 'Browser'

    _url_bar_locator = (By.CSS_SELECTOR, '.urlbar .title')
    _browser_frame_locator = (By.CSS_SELECTOR, 'iframe.browser')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self._root_element = None

    def is_displayed(self):
        return self._root_element.is_displayed()

    def wait_to_be_displayed(self):
        Wait(self.marionette).until(lambda m: self.is_displayed())

    def wait_to_not_be_displayed(self):
        Wait(self.marionette).until(lambda m: not self.is_displayed())

    def switch_to_chrome(self):
        self.marionette.switch_to_frame()

    def switch_to_content(self):
        self.marionette.switch_to_frame()
        web_frame = self._root_element.find_element(*self._browser_frame_locator)
        self.marionette.switch_to_frame(web_frame)

    def go_to_url(self, url, is_private=False):
        # In browser windows, the URL bar displayed is not the regular Rocket bar. But once you
        # tap that URL bar, the regular Rocketbar comes back, in front of the private window.
        # That's why we wait for the private window to be hidden
        self._root_element.find_element(*self._url_bar_locator).tap()
        Wait(self.marionette).until(lambda m: self._root_element.get_attribute('aria-hidden') == 'true')
        from gaiatest.apps.system.regions.search_panel import SearchPanel
        search_panel = SearchPanel(self.marionette)
        return search_panel.go_to_url(url, is_private=is_private)


class Search(BrowserBase):

    _show_windows_button_locator = (By.CSS_SELECTOR, 'button[data-id="show-windows"]')

    _history_locator = (By.ID, 'history')
    _history_item_locator = (By.CSS_SELECTOR, '#history .result')

    def launch(self):
        BrowserBase.launch(self)
        self.set_root_element()

    def set_root_element(self):
        self._root_element = Browser(self.marionette)._root_element

    @property
    def history_items_count(self):
        self.apps.switch_to_displayed_app()
        Wait(self.marionette).until(expected.element_present(*self._history_locator))
        return len(self.marionette.find_elements(*self._history_item_locator))

    def wait_for_history_to_load(self, number_of_items=1):
        Wait(self.marionette).until(lambda m: self.history_items_count == number_of_items)

class Browser(BrowserBase):

    _menu_button_locator = (By.CSS_SELECTOR, '.menu-button')
    _new_window_button_locator = (By.CSS_SELECTOR, 'button[data-id="new-window"]')
    _new_private_window_button_locator = (By.CSS_SELECTOR, 'button[data-id="new-private-window"]')

    _add_to_home_button_locator = (By.CSS_SELECTOR, 'button[data-id="add-to-homescreen"]')
    _share_button_locator = (By.CSS_SELECTOR, 'button[data-id="share"]')
    _cancel_button_locator = (By.CSS_SELECTOR, 'button[data-id="cancel"]')
    _share_to_messages_button_locator = (By.CSS_SELECTOR, 'button[data-manifest="app://sms.gaiamobile.org/manifest.webapp"]')
    _browser_menu_locator = (By.CSS_SELECTOR, '.contextmenu-list')

    _back_button_locator = (By.CSS_SELECTOR, '.back-button')
    _forward_button_locator = (By.CSS_SELECTOR, '.forward-button')
    _reload_button_locator = (By.CSS_SELECTOR, '.reload-button')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.marionette.switch_to_frame()
        frame_id = self.marionette.execute_script("""
            return arguments[0].parentNode.parentNode.id;
        """, [self.apps.displayed_app.frame])
        self._root_element = self.marionette.find_element(By.ID, frame_id)

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

    def open_new_window(self):
        element = self._root_element.find_element(*self._new_window_button_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        return Browser(self.marionette)

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


class PrivateWindow(Browser):

    def go_to_url(self, url):
        return Browser.go_to_url(self, url, is_private=True)
