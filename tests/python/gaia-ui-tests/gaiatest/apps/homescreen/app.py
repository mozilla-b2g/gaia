# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.marionette import Actions

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Homescreen(Base):

    name = 'Homescreen'

    _homescreen_icon_locator = (By.CSS_SELECTOR, 'gaia-grid .icon')
    _homescreen_all_icons_locator = (By.CSS_SELECTOR, 'gaia-grid .icon:not(.placeholder)')
    _edit_mode_locator = (By.CSS_SELECTOR, 'body.edit-mode')
    _search_bar_icon_locator = (By.ID, 'search-input')
    _landing_page_locator = (By.ID, 'icons')

    def launch(self):
        Base.launch(self)

    def tap_search_bar(self):
        search_bar = self.marionette.find_element(*self._search_bar_icon_locator)
        search_bar.tap()

        # TODO These lines are a workaround for bug 1020974
        import time
        time.sleep(1)
        self.marionette.switch_to_frame()
        self.marionette.find_element('id', 'rocketbar-form').tap()

        from gaiatest.apps.homescreen.regions.search_panel import SearchPanel
        return SearchPanel(self.marionette)

    def wait_for_app_icon_present(self, app_name):
        self.wait_for_condition(lambda m: self.installed_app(app_name))

    def wait_for_app_icon_not_present(self, app_name):
        self.wait_for_condition(lambda m: self.installed_app(app_name) is None)

    def is_app_installed(self, app_name):
        """Checks whether app is installed"""
        return self.installed_app(app_name) is not None

    def activate_edit_mode(self):
        app = self.marionette.find_element(*self._homescreen_all_icons_locator)
        Actions(self.marionette).\
            press(app).\
            wait(3).\
            release().\
            wait(1).\
            perform()
        self.wait_for_condition(lambda m: app.is_displayed())
        # Ensure that edit mode is active
        self.wait_for_condition(lambda m: self.is_edit_mode_active)

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
        app_elements = self.app_elements
        Actions(self.marionette).\
            press(app_elements[app_position]).\
            wait(3).\
            move(app_elements[to_position]).\
            wait(1).\
            release().\
            wait(1).\
            perform()

    @property
    def is_edit_mode_active(self):
        return self.is_element_present(*self._edit_mode_locator)

    def tap_collection(self, collection_name):
        for root_el in self.marionette.find_elements(*self._homescreen_all_icons_locator):
            if root_el.text == collection_name:
                self.marionette.execute_script(
                    'arguments[0].scrollIntoView(false);', [root_el])
                root_el.tap()
                from gaiatest.apps.homescreen.regions.collections import Collection
                return Collection(self.marionette)

    @property
    def app_elements(self):
        return self.marionette.execute_script("""
        var gridItems = window.wrappedJSObject.app.grid.getItems();
        var appElements = [];
        for(var i=0; i<gridItems.length; i++){
        // it must have an app to be a
        if(gridItems[i].app) appElements.push(gridItems[i].element);
        }
        return appElements;
        """)

    @property
    def visible_apps(self):
        # Bug 1020910 - Marionette cannot detect correctly detect icons on vertical homescreen
        # The icons' order on screen is not represented in the DOM, thus we use the grid
        return [self.InstalledApp(self.marionette, root_element)
                for root_element in self.app_elements if root_element.is_displayed()]

    def installed_app(self, app_name):
        for root_el in self.marionette.find_elements(*self._homescreen_all_icons_locator):
            if root_el.text == app_name:
                return self.InstalledApp(self.marionette, root_el)

    class InstalledApp(PageRegion):

        _delete_app_locator = (By.CSS_SELECTOR, 'span.remove')

        @property
        def name(self):
            return self.root_element.text

        def tap_icon(self):
            expected_name = self.name

            #TODO remove scroll after Bug 937053 is resolved
            self.marionette.execute_script(
                'arguments[0].scrollIntoView(false);', [self.root_element])

            self.root_element.tap()
            self.wait_for_condition(lambda m: self.apps.displayed_app.name.lower() == expected_name.lower())
            self.apps.switch_to_displayed_app()

        def tap_delete_app(self):
            """Tap on (x) to delete app"""
            self.root_element.find_element(*self._delete_app_locator).tap()

            from gaiatest.apps.homescreen.regions.confirm_dialog import ConfirmDialog
            return ConfirmDialog(self.marionette)
