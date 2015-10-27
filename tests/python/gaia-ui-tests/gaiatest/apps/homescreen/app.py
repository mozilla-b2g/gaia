# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait
from marionette_driver.marionette import Actions
from marionette_driver.errors import NoSuchElementException

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Homescreen(Base):

    name = 'Default Home Screen'

    _homescreen_icon_locator = (By.CSS_SELECTOR, 'gaia-grid .icon')
    _all_icons_locator = (By.TAG_NAME, 'gaia-app-icon')
    _homescreen_collection_icon = (By.CSS_SELECTOR, 'gaia-grid .collection')
    _edit_mode_locator = (By.CSS_SELECTOR, 'body.edit-mode')
    _search_bar_icon_locator = (By.ID, 'search-input')
    _landing_page_locator = (By.ID, 'icons')
    _bookmark_icons_locator = (By.CSS_SELECTOR, 'gaia-grid .bookmark')
    _divider_locator = (By.CSS_SELECTOR, 'section.divider')
    _divider_separator_locator = (By.CSS_SELECTOR, 'section.divider .separator > span')
    _exit_edit_mode_locator = (By.ID, 'exit-edit-mode')

    _body_dragging_locator = (By.CSS_SELECTOR, 'body.dragging')
    _apps_locator = (By.ID, 'apps')
    _app_icon_locator = (By.CSS_SELECTOR, 'gaia-app-icon[data-identifier="%s"]')
    _remove_locator = (By.ID, 'remove')

    _scollable_div_locator = (By.CSS_SELECTOR, '#apps-panel div.scrollable')

    def wait_for_app_icon_present(self, app_manifest):
        Wait(self.marionette, timeout=30).until(lambda m: self.installed_app(app_manifest))

    def wait_for_app_icon_not_present(self, app_manifest):
        def _app_is_not_found(_):
            try:
                self.installed_app(app_manifest)
            except NoSuchElementException:
                return True
            return False

        Wait(self.marionette).until(_app_is_not_found)

    def wait_for_bookmark_icon_not_present(self, bookmark_title):
        Wait(self.marionette).until(lambda m: self.bookmark(bookmark_title) is None)

    def is_app_installed(self, app_manifest):
        """Checks whether app is installed"""
        return self.installed_app(app_manifest) is not None

    @property
    def is_at_topmost_position(self):
        position = self.marionette.execute_script("""
          return {x:arguments[0].scrollLeft, y: arguments[0].scrollTop}
        """, [self.marionette.find_element(*self._scollable_div_locator)])
        return (position['x'] == 0 and position['y'] == 0)

    def scroll_to_icon(self, icon_position=0):
        app_icon = self.visible_apps[icon_position]
        self.marionette.execute_script(
            'arguments[0].scrollIntoView(true);', [app_icon.root_element])

    def move_app_to_position(self, app_position, to_position):
        app = self.app_elements[app_position]
        destination_element = self.app_elements[to_position].root_element
        app.move_to(destination_element)

    @property
    def app_elements(self):
        return [self.GaiaAppIcon(self.marionette, app_element)
                for app_element in self.marionette.find_elements(*self._all_icons_locator)]

    @property
    def visible_apps(self):
        return [homescreen_element for homescreen_element in self.app_elements if homescreen_element.is_displayed]

    def wait_for_number_of_apps(self, number_of_apps=1):
        Wait(self.marionette).until(lambda m: len(self.app_elements) >= number_of_apps)

    def installed_app(self, app_manifest):
        apps_container = self.marionette.find_elements(*self._apps_locator)
        self.marionette.switch_to_shadow_root(apps_container)
        icon_locator = (self._app_icon_locator[0], self._app_icon_locator[1] % app_manifest)
        app_icon = self.marionette.find_element(*icon_locator)
        return self.GaiaAppIcon(self.marionette, app_icon)

    def bookmark(self, bookmark_title):
        for root_el in self.marionette.find_elements(*self._bookmark_icons_locator):
            if root_el.text == bookmark_title:
                return self.GaiaAppIcon(self.marionette, root_el)

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

    def delete_app(self, app_manifest):
        app = self.installed_app(app_manifest)
        remove_action_element = self.marionette.find_element(*self._remove_locator)
        app.move_to(remove_action_element)
        from gaiatest.apps.homescreen.regions.confirm_dialog import ConfirmDialog
        return ConfirmDialog(self.marionette)

    class GaiaAppIcon(PageRegion):

        @property
        def manifest_url(self):
            return self.root_element.get_attribute('data-identifier')

        @property
        def is_app_installed(self):
            self.marionette.switch_to_shadow_root(self.root_element)
            app_installed = self.root_element.get_attribute('data-test-icon-url') == 'app-icon'
            self.marionette.switch_to_shadow_root()
            return app_installed

        @property
        def is_displayed(self):
            return self.root_element.is_displayed()

        def tap_icon(self):
            expected_manifest_url = self.manifest_url
            self.root_element.tap()
            Wait(self.marionette).until(lambda m: self.apps.displayed_app.manifest_url == expected_manifest_url)
            self.apps.switch_to_displayed_app()

        def move_to(self, html_element):
            self.marionette.execute_script('arguments[0].scrollIntoView(false);', [self.root_element])

            Actions(self.marionette).\
                press(self.root_element).\
                wait(3).\
                move(html_element).\
                wait(1).\
                release().\
                wait(1).\
                perform()
