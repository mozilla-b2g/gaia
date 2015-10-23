# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait
from marionette_driver.marionette import Actions

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Homescreen(Base):

    name = 'Default Home Screen'

    _homescreen_icon_locator = (By.CSS_SELECTOR, 'gaia-grid .icon')
    _homescreen_all_icons_locator = (By.CSS_SELECTOR, 'gaia-grid .icon:not(.placeholder)')
    _homescreen_collection_icon = (By.CSS_SELECTOR, 'gaia-grid .collection')
    _edit_mode_locator = (By.CSS_SELECTOR, 'body.edit-mode')
    _search_bar_icon_locator = (By.ID, 'search-input')
    _bookmark_icons_locator = (By.CSS_SELECTOR, 'gaia-grid .bookmark')
    _divider_locator = (By.CSS_SELECTOR, 'section.divider')
    _divider_separator_locator = (By.CSS_SELECTOR, 'section.divider .separator > span')
    _exit_edit_mode_locator = (By.ID, 'exit-edit-mode')

    _icons_locator = (By.TAG_NAME, 'gaia-app-icon')

    _body_dragging_locator = (By.CSS_SELECTOR, 'body.dragging')
    _apps_locator = (By.ID, 'apps')
    _app_icon_locator = (By.CSS_SELECTOR, 'gaia-app-icon[data-identifier="%s"]')
    _remove_locator = (By.ID, 'remove')

    def launch(self):
        Base.launch(self)

    def wait_for_app_icon_present(self, app_manifest):
        Wait(self.marionette, timeout=30).until(lambda m: self.installed_app(app_manifest))

    def wait_for_app_icon_not_present(self, app_manifest):
        Wait(self.marionette).until(lambda m: self.installed_app(app_manifest) is None)

    def wait_for_bookmark_icon_not_present(self, bookmark_title):
        Wait(self.marionette).until(lambda m: self.bookmark(bookmark_title) is None)

    def is_app_installed(self, app_manifest):
        """Checks whether app is installed"""
        return self.installed_app(app_manifest) is not None

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
        for root_el in self.marionette.find_elements(*self._homescreen_collection_icon):
            if root_el.text == collection_name:
                # TODO bug 1043293 introduced a timing/tap race issue here
                time.sleep(0.5)
                root_el.tap()
                from gaiatest.apps.homescreen.regions.collections import Collection
                return Collection(self.marionette)

    @property
    def app_elements(self):
        return self.marionette.find_elements(*self._icons_locator)

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

    def installed_app(self, app_manifest):
        apps_container = self.marionette.find_elements(*self._apps_locator)
        self.marionette.switch_to_shadow_root(apps_container)
        icon_locator = (
             self._app_icon_locator[0],
             self._app_icon_locator[1] % app_manifest
        )
        _test_locator = (By.CSS_SELECTOR, 'gaia-app-icon')
        element = self.marionette.find_element(*_test_locator)
        app_icon = self.marionette.find_element(*icon_locator)
        return self.InstalledApp(self.marionette, app_icon)

    def bookmark(self, bookmark_title):
        for root_el in self.marionette.find_elements(*self._bookmark_icons_locator):
            if root_el.text == bookmark_title:
                return self.InstalledApp(self.marionette, root_el)

    @property
    def number_of_columns(self):

        _icon_container_text = 'div.gaia-container-child:nth-child(%s)'
        #first element is always on the first column
        _first_icon_locator = (By.CSS_SELECTOR, _icon_container_text % str(1))
        # wait until the icons are fully drawn
        Wait(self.marionette).until(lambda m: self.marionette.find_element(*_first_icon_locator).rect['x'] != 0)
        base_x_axis = self.marionette.find_element(*_first_icon_locator).rect['x']
        has_row_changed = False
        column = 1
        while not has_row_changed:
            _icon_locator = (By.CSS_SELECTOR, _icon_container_text % str(column+1))
            if self.marionette.find_element(*_icon_locator).rect['x'] == base_x_axis:
                has_row_changed = True
            else:
                column += 1

        return column

    class InstalledApp(PageRegion):

        @property
        def manifest_url(self):
            return self.root_element.get_attribute('data-identifier')

        def tap_icon(self):
            expected_manifest_url = self.manifest_url
            self.root_element.tap()
            Wait(self.marionette).until(lambda m: self.apps.displayed_app.manifest_url == expected_manifest_url)
            self.apps.switch_to_displayed_app()
