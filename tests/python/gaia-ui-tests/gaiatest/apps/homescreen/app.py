# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.marionette import Actions

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Homescreen(Base):

    name = 'Homescreen'

    _homescreen_icon_locator = (By.CSS_SELECTOR, 'li.icon[aria-label="%s"]')
    _visible_icons_locator = (By.CSS_SELECTOR, 'div.page[style*="transform: translateX(0px);"] > ol > .icon')
    _edit_mode_locator = (By.CSS_SELECTOR, 'body[data-mode="edit"]')
    _search_bar_icon_locator = (By.CSS_SELECTOR, '#evme-activation-icon input')
    _landing_page_locator = (By.ID, 'icongrid')
    _collections_locator = (By.CSS_SELECTOR, 'li.icon[data-collection-name]')
    _collection_locator = (By.CSS_SELECTOR, "li.icon[data-collection-name *= '%s']")

    def launch(self):
        Base.launch(self)

    def tap_search_bar(self):
        search_bar = self.marionette.find_element(*self._search_bar_icon_locator)
        search_bar.tap()
        from gaiatest.apps.homescreen.regions.search_panel import SearchPanel
        return SearchPanel(self.marionette)

    def wait_for_app_icon_present(self, app_name):
        self.wait_for_element_present(self._homescreen_icon_locator[0], self._homescreen_icon_locator[1] % app_name)

    def wait_for_app_icon_not_present(self, app_name):
        self.wait_for_element_not_present(self._homescreen_icon_locator[0], self._homescreen_icon_locator[1] % app_name)

    def is_app_installed(self, app_name):
        """Checks whether app is installed"""
        is_installed = False
        for i in range(self.homescreen_get_total_pages_number):
            if self.is_element_displayed(self._homescreen_icon_locator[0], self._homescreen_icon_locator[1] % app_name):
                is_installed = True
                break
            elif self.homescreen_has_more_pages:
                self.go_to_next_page()

        return is_installed

    def go_to_next_page(self):
        self.marionette.execute_script('window.wrappedJSObject.GridManager.goToNextPage()')
        self.wait_for_condition(lambda m: m.find_element('tag name', 'body')
            .get_attribute('data-transitioning') != 'true')

    def touch_home_button(self):
        self.marionette.switch_to_frame()
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home'));")
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == self.name)
        self.marionette.switch_to_frame(self.apps.displayed_app.frame)

    def activate_edit_mode(self):
        app = self.marionette.find_element(*self._visible_icons_locator)
        Actions(self.marionette).\
            press(app).\
            wait(3).\
            release().\
            perform()
        self.wait_for_element_displayed(By.CSS_SELECTOR, 'div.dockWrapper ol[style*="transition: -moz-transform 0.5ms ease 0s;"]')

    def open_context_menu(self):
        test = self.marionette.find_element(*self._landing_page_locator)
        Actions(self.marionette).\
            press(test, 0, 0).\
            wait(3).\
            release().\
            perform()
        from gaiatest.apps.homescreen.regions.context_menu import ContextMenu
        return ContextMenu(self.marionette)

    def move_app_to_position(self, app_position, to_position):
        app = self.marionette.find_elements(*self._visible_icons_locator)[app_position]
        destination = self.marionette.find_elements(*self._visible_icons_locator)[to_position]

        Actions(self.marionette).\
            press(app).\
            wait(3).\
            move(destination).\
            wait(1).\
            release().\
            perform()

    @property
    def is_edit_mode_active(self):
        return self.is_element_present(*self._edit_mode_locator)

    @property
    def homescreen_get_total_pages_number(self):
        return self.marionette.execute_script("""
        var pageHelper = window.wrappedJSObject.GridManager.pageHelper;
        return pageHelper.getTotalPagesNumber();""")

    @property
    def homescreen_has_more_pages(self):
        # the naming of this could be more concise when it's in an app object!
        return self.marionette.execute_script("""
        var pageHelper = window.wrappedJSObject.GridManager.pageHelper;
        return pageHelper.getCurrentPageNumber() < (pageHelper.getTotalPagesNumber() - 1);""")

    @property
    def collections_count(self):
        return len(self.marionette.find_elements(*self._collections_locator))

    def tap_collection(self, name):
        el = self.marionette.find_element(self._collection_locator[0],
                                          self._collection_locator[1] % name)
        el.tap()

        from gaiatest.apps.homescreen.regions.collections import Collection
        return Collection(self.marionette)

    @property
    def visible_apps(self):
        return [self.InstalledApp(self.marionette, root_el)
                for root_el in self.marionette.find_elements(*self._visible_icons_locator)]

    def installed_app(self, app_name):
        root_el = self.marionette.find_element(self._homescreen_icon_locator[0], self._homescreen_icon_locator[1] % app_name)
        return self.InstalledApp(self.marionette, root_el)

    class InstalledApp(PageRegion):

        _delete_app_locator = (By.CSS_SELECTOR, 'li.icon[aria-label="%s"] span.options')

        @property
        def name(self):
            return self.root_element.get_attribute('aria-label')

        def tap_icon(self):
            expected_name = self.name
            self.root_element.tap()
            self.wait_for_condition(lambda m: self.apps.displayed_app.name.lower() == expected_name.lower())
            self.marionette.switch_to_frame(self.apps.displayed_app.frame)

        def tap_delete_app(self):
            """Tap on (x) to delete app"""
            delete_app_locator = (self._delete_app_locator[0], self._delete_app_locator[1] % self.name)
            self.wait_for_element_displayed(*delete_app_locator)
            self.marionette.find_element(*delete_app_locator).tap()

            from gaiatest.apps.homescreen.regions.confirm_dialog import ConfirmDialog
            return ConfirmDialog(self.marionette)
