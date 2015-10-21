# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from marionette_driver.keys import Keys

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion
from gaiatest.apps.homescreen.regions.confirm_install import ConfirmInstall
from gaiatest.apps.system.app import System


class Marketplace(Base):

    _loading_fragment_locator = (By.ID, 'splash-overlay')
    _search_locator = (By.ID, 'search-q')
    _filter_locator = (By.ID, 'compat-filter')
    _marketplace_iframe_locator = (By.CSS_SELECTOR, 'iframe[src*="marketplace"]')
    _search_toggle_locator = (By.CSS_SELECTOR, '.header--search-toggle')
    name = 'Marketplace'
    manifest_url = 'https://marketplace.firefox.com/packaged.webapp'

    def search(self, term):
        iframe = Wait(self.marionette).until(
            expected.element_present(*self._marketplace_iframe_locator))
        Wait(self.marionette).until(expected.element_displayed(iframe))
        self.marionette.switch_to_frame(iframe)

        # This sleep seems necessary, otherwise on device we get timeout failure on display search_box sometimes, see bug 1136791
        import time
        time.sleep(10)

        search_toggle = Wait(self.marionette).until(
            expected.element_present(*self._search_toggle_locator))
        Wait(self.marionette).until(expected.element_displayed(search_toggle))
        search_toggle.tap()

        search_box = Wait(self.marionette).until(
            expected.element_present(*self._search_locator))
        Wait(self.marionette).until(expected.element_displayed(search_box))

        # This sleep is necessary, otherwise the search results are not shown on desktop b2g
        import time
        time.sleep(0.5)

        # search for the app
        search_box.send_keys(term)
        search_box.send_keys(Keys.RETURN)
        return SearchResults(self.marionette)

    def get_current_displayed_result(self):
        iframe = Wait(self.marionette).until(
            expected.element_present(*self._marketplace_iframe_locator))
        Wait(self.marionette).until(expected.element_displayed(iframe))
        self.marionette.switch_to_frame(iframe)

        return SearchResults(self.marionette)

class SearchResults(Base):

    _search_results_loading_locator = (By.CSS_SELECTOR, '.loading')
    _search_result_locator = (By.CSS_SELECTOR, '#search-results li.item')

    @property
    def search_results(self):
        results = Wait(self.marionette).until(
            lambda m: m.find_elements(*self._search_result_locator))
        Wait(self.marionette).until(expected.element_displayed(results[0]))
        return [Result(self.marionette, result) for result in results]

class Result(PageRegion):

    _install_button_locator = (By.CSS_SELECTOR, '.button.install')
    _name_locator = (By.CSS_SELECTOR, 'h3[itemprop="name"]')

    def tap_install_button(self):
        self.root_element.find_element(*self._install_button_locator).tap()
        self.marionette.switch_to_frame()

    def tap_open_app_button(self, app_title, _app_locator):
        button = self.root_element.find_element(*self._install_button_locator)
        Wait(self.marionette).until(lambda m: button.text == 'Open app')
        button.tap()
        self.apps.switch_to_displayed_app()
        Wait(self.marionette).until(lambda m: m.title == app_title)
        app_element = self.marionette.find_element(*_app_locator)
        Wait(self.marionette).until(lambda m: app_element.is_displayed())

    def get_app_name(self):
        return self.root_element.find_element(*self._name_locator).text

class MarketplaceDev(Marketplace):

    name = 'Dev'
    manifest_url = 'https://marketplace.firefox.com/app/bee10fbb-7829-4d99-8a9f-a6d0a905138e/manifest.webapp'

    _enable_addons_locator = (By.ID, 'enable-addons')

    def _enable_addons(self):
        enable_addon_button = Wait(self.marionette).until(
            expected.element_present(*self._enable_addons_locator))
        Wait(self.marionette).until(expected.element_displayed(enable_addon_button))
        enable_addon_button.tap()

    def _open_addon(self, addon_name):
        selector = '//a[descendant::*[text()="%s"]]' % addon_name
        addon_locator = (By.XPATH, selector)

        addon_link = Wait(self.marionette, timeout=20, interval=1).until(
            expected.element_present(*addon_locator))
        Wait(self.marionette).until(expected.element_displayed(addon_link))
        self.marionette.execute_script('arguments[0].scrollIntoView(true);', [addon_link])
        addon_link.tap()
        return AddonPage(self.marionette)

    def install_addon(self, addon_name):
        # Open debug page
        self.search(':debug')

        self._enable_addons()

        addon_page = self._open_addon(addon_name)
        addon_page.install_link()

class AddonPage(Base):

    _addon_install_locator = (By.CSS_SELECTOR, '.addon-install-btn')

    def install_link(self):
        element = Wait(self.marionette, timeout=20, interval=1).until(
            expected.element_present(*self._addon_install_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

        confirm_install = ConfirmInstall(self.marionette)
        confirm_install.tap_confirm()

        system = System(self.marionette)
        system.wait_for_system_banner_displayed()
        system.wait_for_system_banner_not_displayed()

        self.apps.switch_to_displayed_app()
