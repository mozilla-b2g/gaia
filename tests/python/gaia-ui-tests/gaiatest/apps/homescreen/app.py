# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait
from marionette_driver.marionette import Actions

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Homescreen(Base):

    name = 'Homescreen'

    _homescreen_icon_locator = (By.CSS_SELECTOR, 'gaia-grid .icon')
    _homescreen_all_icons_locator = (By.CSS_SELECTOR, 'gaia-grid .icon:not(.placeholder)')
    _edit_mode_locator = (By.CSS_SELECTOR, 'body.edit-mode')
    _search_bar_icon_locator = (By.ID, 'search-input')
    _landing_page_locator = (By.ID, 'icons')
    _bookmark_icons_locator = (By.CSS_SELECTOR, 'gaia-grid .bookmark')
    _divider_locator = (By.CSS_SELECTOR, 'section.divider')
    _divider_separator_locator = (By.CSS_SELECTOR, 'section.divider .separator > span')
    _exit_edit_mode_locator = (By.ID, 'exit-edit-mode')

    def launch(self):
        Base.launch(self)

    def tap_search_bar(self):
        search_bar = self.marionette.find_element(*self._search_bar_icon_locator)
        search_bar.tap()

        # TODO These lines are a workaround for bug 1020974
        import time
        time.sleep(1)
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(lambda m: not self.keyboard.is_keyboard_displayed)
        self.marionette.find_element('id', 'rocketbar-form').tap()
        Wait(self.marionette).until(lambda m: self.keyboard.is_keyboard_displayed)

        from gaiatest.apps.homescreen.regions.search_panel import SearchPanel
        return SearchPanel(self.marionette)

    def wait_for_app_icon_present(self, app_name):
        Wait(self.marionette, timeout=30).until(lambda m: self.installed_app(app_name))

    def wait_for_app_icon_not_present(self, app_name):
        Wait(self.marionette).until(lambda m: self.installed_app(app_name) is None)

    def wait_for_bookmark_icon_not_present(self, bookmark_title):
        Wait(self.marionette).until(lambda m: self.bookmark(bookmark_title) is None)

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
        Wait(self.marionette).until(expected.element_displayed(app))
        # Ensure that edit mode is active
        Wait(self.marionette).until(expected.element_present(
            *self._edit_mode_locator))

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

        self.marionette.execute_script(
            'arguments[0].scrollIntoView(false);', [app_elements[app_position]])

        Actions(self.marionette).\
            press(app_elements[app_position]).\
            wait(3).\
            move(app_elements[to_position]).\
            wait(1).\
            release().\
            wait(1).\
            perform()

    def move_to_divider(self, app_position, divider_position):
        app_element = self.app_elements[app_position]
        separator_element = self.marionette.find_elements(*self._divider_separator_locator)[divider_position]

        self.marionette.execute_script(
            'arguments[0].scrollIntoView(false);', [app_element])

        Actions(self.marionette).\
            press(app_element).\
            wait(3).\
            move(separator_element).\
            wait(1).\
            release().\
            wait(1).\
            perform()

    @property
    def is_edit_mode_active(self):
        return self.is_element_present(*self._edit_mode_locator)

    def tap_edit_done(self):
         element = self.marionette.find_element(*self._exit_edit_mode_locator)
         Wait(self.marionette).until(lambda m: element.is_displayed())
         element.tap()
         Wait(self.marionette).until(lambda m: not element.is_displayed())
         Wait(self.marionette).until(expected.element_not_present(
             *self._edit_mode_locator))

    def tap_collection(self, collection_name):
        for root_el in self.marionette.find_elements(*self._homescreen_all_icons_locator):
            if root_el.text == collection_name:
                # TODO bug 1043293 introduced a timing/tap race issue here
                time.sleep(0.5)
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
    def divider_elements(self):
        return self.marionette.find_elements(*self._divider_locator)

    @property
    def visible_apps(self):
        # Bug 1020910 - Marionette cannot detect correctly detect icons on vertical homescreen
        # The icons' order on screen is not represented in the DOM, thus we use the grid
        return [self.InstalledApp(self.marionette, root_element)
                for root_element in self.app_elements if root_element.is_displayed()]

    def wait_for_number_of_apps(self, number_of_apps=1):
        Wait(self.marionette).until(lambda m: len(self.app_elements) >= number_of_apps)

    def installed_app(self, app_name):
        for root_el in self.marionette.find_elements(*self._homescreen_all_icons_locator):
            if root_el.text == app_name and (root_el.get_attribute('data-app-state') == 'ready' or
                'bookmark' in root_el.get_attribute('class') or 'collection' in root_el.get_attribute('class')):
                return self.InstalledApp(self.marionette, root_el)

    def bookmark(self, bookmark_title):
        for root_el in self.marionette.find_elements(*self._bookmark_icons_locator):
            if root_el.text == bookmark_title:
                return self.InstalledApp(self.marionette, root_el)

    @property
    def number_of_columns(self):
        element = self.marionette.find_element(*self._landing_page_locator)
        Wait(self.marionette).until(lambda m: element.get_attribute('cols') is not None)
        return int(element.get_attribute('cols'))

    class InstalledApp(PageRegion):

        _delete_app_locator = (By.CSS_SELECTOR, 'span.remove')

        @property
        def name(self):
            return self.root_element.text

        def tap_icon(self):
            expected_name = self.name

            # TODO bug 1043293 introduced a timing/tap race issue here
            time.sleep(0.5)
            self.root_element.tap(y=1)
            Wait(self.marionette).until(lambda m: self.apps.displayed_app.name.lower() == expected_name.lower())
            self.apps.switch_to_displayed_app()

        def tap_delete_app(self):
            """Tap on (x) to delete app"""
            self.root_element.find_element(*self._delete_app_locator).tap()

            from gaiatest.apps.homescreen.regions.confirm_dialog import ConfirmDialog
            return ConfirmDialog(self.marionette)
