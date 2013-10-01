# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Homescreen(Base):

    name = 'Homescreen'

    _homescreen_iframe_locator = (By.CSS_SELECTOR, 'div.homescreen iframe')
    _homescreen_icon_locator = (By.CSS_SELECTOR, 'li.icon[aria-label="%s"]')
    _search_bar_icon_locator = (By.CSS_SELECTOR, '#evme-activation-icon input')
    _landing_page_locator = (By.ID, 'icongrid')
    _collections_locator = (By.CSS_SELECTOR, 'li.icon[data-collection-name]')
    _collection_locator = (By.CSS_SELECTOR, "li.icon[data-collection-name *= '%s']")

    def launch(self):
        Base.launch(self)

    def switch_to_homescreen_frame(self):
        self.marionette.switch_to_frame()
        hs_frame = self.marionette.find_element(*self._homescreen_iframe_locator)
        self.marionette.switch_to_frame(hs_frame)

    def tap_search_bar(self):
        search_bar = self.marionette.find_element(*self._search_bar_icon_locator)
        search_bar.tap()
        from gaiatest.apps.homescreen.regions.search_panel import SearchPanel
        return SearchPanel(self.marionette)

    def is_app_installed(self, app_name):
        """Checks whether app is installed"""
        is_installed = False
        while self.homescreen_has_more_pages:
            if self.is_element_displayed(self._homescreen_icon_locator[0], self._homescreen_icon_locator[1] % app_name):
                is_installed = True
                break
            self.go_to_next_page()

        return is_installed

    def go_to_next_page(self):
        self.marionette.execute_script('window.wrappedJSObject.GridManager.goToNextPage()')

    @property
    def homescreen_has_more_pages(self):
        # the naming of this could be more concise when it's in an app object!
        return self.marionette.execute_script("""
        var pageHelper = window.wrappedJSObject.GridManager.pageHelper;
        return pageHelper.getCurrentPageNumber() < (pageHelper.getTotalPagesNumber() - 1);""")

    def wait_for_landing_page_visible(self):
        self.wait_for_element_displayed(*self._landing_page_locator)

    @property
    def collections_count(self):
        return len(self.marionette.find_elements(*self._collections_locator))

    def tap_collection(self, name):
        el = self.marionette.find_element(self._collection_locator[0],
                                          self._collection_locator[1] % name)
        el.tap()

        from gaiatest.apps.homescreen.regions.collections import Collection
        return Collection(self.marionette)
