# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import re
import time

from marionette.by import By
from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Browser(Base):

    name = "Browser"

    _browser_frame_locator = (By.CSS_SELECTOR, 'iframe.browser-tab')

    # Awesome bar/url bar
    _awesome_bar_locator = (By.ID, 'url-input')
    _url_button_locator = (By.ID, 'url-button')
    _throbber_locator = (By.ID, 'throbber')

    # Tab list area
    _tab_badge_locator = (By.ID, 'tabs-badge')
    _new_tab_button_locator = (By.ID, 'new-tab-button')
    _tabs_list_locator = (By.CSS_SELECTOR, '#tabs-list > ul li a')

    # Browser footer
    _back_button_locator = (By.ID, 'back-button')
    _forward_button_locator = (By.ID, 'forward-button')
    _bookmark_button_locator = (By.ID, 'bookmark-button')

    # Bookmark menu
    _bookmark_menu_locator = (By.ID, 'bookmark-menu')
    _add_bookmark_to_home_screen_choice_locator = (By.ID, 'bookmark-menu-add-home')

    # System app - add bookmark to homescreen dialog
    _add_bookmark_to_home_screen_frame_locator = (By.CSS_SELECTOR, 'iframe[src^="app://homescreen"][src$="save-bookmark.html"]')
    _add_bookmark_to_home_screen_dialog_button_locator = (By.ID, 'button-bookmark-add')
    _bookmark_title_input_locator = (By.ID, 'bookmark-title')

    def launch(self):
        Base.launch(self)
        self.wait_for_condition(lambda m: m.execute_script("return window.wrappedJSObject.Browser.hasLoaded;"))

    def go_to_url(self, url, timeout=30):
        self.wait_for_element_displayed(*self._awesome_bar_locator)
        awesome_bar = self.marionette.find_element(*self._awesome_bar_locator)
        # TODO Tap one pixel above bottom edge to dodge the System update notification banner bug 876723
        awesome_bar.tap(y=(awesome_bar.size['height'] - 1))
        self.wait_for_condition(lambda m: self.keyboard.is_displayed())
        self.keyboard.send(url)
        self.tap_go_button(timeout=timeout)

    @property
    def url_src(self):
        return self.marionette.find_element(*self._browser_frame_locator).get_attribute('src')

    @property
    def url(self):
        return self.marionette.execute_script("return window.wrappedJSObject.Browser.currentTab.url;")

    def switch_to_content(self):
        web_frames = self.marionette.find_elements(*self._browser_frame_locator)
        for web_frame in web_frames:
            if web_frame.is_displayed():
                self.marionette.switch_to_frame(web_frame)
                break

    def switch_to_chrome(self):
        self.marionette.switch_to_frame()
        self.marionette.switch_to_frame(self.app.frame)

    def tap_go_button(self, timeout=30):
        url_button = self.marionette.find_element(*self._url_button_locator)
        # TODO Tap one pixel above bottom edge to dodge the System update notification banner bug 876723
        url_button.tap(y=(url_button.size['height'] - 1))
        self.wait_for_throbber_not_visible(timeout=timeout)
        self.wait_for_element_displayed(*self._bookmark_button_locator)

    def tap_back_button(self):
        current_url = self.url
        self.marionette.find_element(*self._back_button_locator).tap()
        self.wait_for_condition(lambda m: self.url != current_url)

    def tap_forward_button(self):
        current_url = self.url
        self.marionette.find_element(*self._forward_button_locator).tap()
        self.wait_for_condition(lambda m: self.url != current_url)

    def tap_bookmark_button(self):
        self.marionette.find_element(*self._bookmark_button_locator).tap()
        self.wait_for_element_displayed(*self._bookmark_menu_locator)

    def tap_add_bookmark_to_home_screen_choice_button(self):
        self.wait_for_element_displayed(*self._add_bookmark_to_home_screen_choice_locator)
        self.marionette.find_element(*self._add_bookmark_to_home_screen_choice_locator).tap()
        # TODO: Remove sleep when Bug # 815115 is addressed, or if we can wait for a Javascript condition
        time.sleep(1)
        self.switch_to_add_bookmark_frame()

    def switch_to_add_bookmark_frame(self):
        # Switch to System app where the add bookmark dialog resides
        self.marionette.switch_to_frame()
        self.wait_for_element_displayed(*self._add_bookmark_to_home_screen_frame_locator)
        self.frame = self.marionette.find_element(*self._add_bookmark_to_home_screen_frame_locator)
        self.marionette.switch_to_frame(self.frame)
        self.wait_for_element_displayed(*self._bookmark_title_input_locator)

    def tap_add_bookmark_to_home_screen_dialog_button(self):
        self.wait_for_element_displayed(*self._add_bookmark_to_home_screen_dialog_button_locator)
        self.marionette.find_element(*self._add_bookmark_to_home_screen_dialog_button_locator).tap()

        # Wait for the Add to bookmark frame to be dismissed
        self.marionette.switch_to_frame()
        self.wait_for_element_not_displayed(*self._add_bookmark_to_home_screen_frame_locator)

        self.switch_to_chrome()

    def type_bookmark_title(self, value):
        element = self.marionette.find_element(*self._bookmark_title_input_locator)
        element.clear()
        element.send_keys(value)
        # Here we must dismiss the keyboard because it obscures the elements on the page
        # Marionette cannot scroll them into view because it is a modal frame
        self.keyboard.dismiss()
        self.switch_to_add_bookmark_frame()

    def wait_for_throbber_not_visible(self, timeout=30):
        # TODO see if we can reduce this timeout in the future. >10 seconds is poor UX
        self.wait_for_condition(lambda m: not self.is_throbber_visible, timeout=timeout)

    @property
    def is_throbber_visible(self):
        return self.marionette.find_element(*self._throbber_locator).get_attribute('class') == 'loading'

    @property
    def is_awesome_bar_visible(self):
        return self.marionette.find_element(*self._awesome_bar_locator).is_displayed()

    def tap_tab_badge_button(self):
        self.wait_for_element_displayed(*self._tab_badge_locator)
        tab_badge_button = self.marionette.find_element(*self._tab_badge_locator)
        # TODO Tap above bottom edge to dodge the System update notification banner bug 876723
        tab_badge_button.tap(y=(tab_badge_button.size['height'] - 4))

        self.wait_for_element_not_displayed(*self._tab_badge_locator)

    def tap_add_new_tab_button(self):
        new_tab_button = self.marionette.find_element(*self._new_tab_button_locator)
        # TODO Tap one pixel above bottom edge to dodge the System update notification banner bug 876723
        new_tab_button.tap(y=(new_tab_button.size['height'] - 1))

        self.wait_for_element_displayed(*self._awesome_bar_locator)

    @property
    def displayed_tabs_number(self):
        displayed_number = self.marionette.find_element(*self._tab_badge_locator).text
        return int(re.match(r'\d+', displayed_number).group())

    @property
    def tabs_count(self):
        return len(self.marionette.find_elements(*self._tabs_list_locator))

    @property
    def tabs(self):
        return [self.Tab(marionette=self.marionette, element=tab)
                for tab in self.marionette.find_elements(*self._tabs_list_locator)]

    class Tab(PageRegion):

        def tap_tab(self):
            # TODO: Bug 876411 - Click works but tap does not on tabs on browser app
            self.root_element.click()

            # TODO This wait is a workaround until Marionette can correctly interpret the displayed state
            self.wait_for_condition(lambda m: m.execute_script("return window.wrappedJSObject.Browser.currentScreen;") == 'page-screen')
