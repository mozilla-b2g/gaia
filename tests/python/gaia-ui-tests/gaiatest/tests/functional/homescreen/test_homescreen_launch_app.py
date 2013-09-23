# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase

MANIFEST = 'http://mozqa.com/data/webapps/mozqa.com/manifest.webapp'
APP_NAME = 'Mozilla QA WebRT Tester'
TITLE = 'Index of /data'


class TestLaunchApp(GaiaTestCase):
    _yes_button_locator = (By.ID, 'app-install-install-button')
    _installed_app_locator = (By.CSS_SELECTOR, 'li.icon[aria-label="%s"]' % APP_NAME)

    # locator for li.icon, because click on label doesn't work.
    _visible_icon_locator = (By.CSS_SELECTOR, 'div.page[style*="transform: translateX(0px);"] li.icon[aria-label="%s"]' % APP_NAME)
    _app_locator = (By.CSS_SELECTOR, 'iframe[src="http://mozqa.com/data"]')
    _header_locator = (By.CSS_SELECTOR, 'h1')

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()
        self.homescreen = self.apps.launch('Homescreen')

        # install app
        self.marionette.switch_to_frame()
        self.marionette.execute_script(
            'navigator.mozApps.install("%s")' % MANIFEST)

        # click yes on the installation dialog and wait for icon displayed
        self.wait_for_element_displayed(*self._yes_button_locator)
        self.marionette.find_element(*self._yes_button_locator).tap()

        self.marionette.switch_to_frame(self.homescreen.frame)

        # We don't need to check it's displayed, only present(installed)
        # We'll find the icon in the test instead
        self.wait_for_element_present(*self._installed_app_locator)

    def test_launch_app(self):
        # We iterate through the homescreen pages until we find the app icon visible
        # It can be on different screens depending on what is packaged with the build
        while True:
            if self.is_element_present(*self._visible_icon_locator):
                break
            if self._homescreen_has_more_pages():
                self._go_to_next_page()
            else:
                break

        # click icon and wait for h1 element displayed
        self.marionette.find_element(*self._visible_icon_locator).tap()
        self.marionette.switch_to_frame()
        iframe = self.marionette.find_element(*self._app_locator)
        self.marionette.switch_to_frame(iframe)
        self.wait_for_element_displayed(*self._header_locator, timeout=20)
        self.assertEqual(self.marionette.find_element(*self._header_locator).text, TITLE)

    def _go_to_next_page(self):
        self.marionette.execute_script('window.wrappedJSObject.GridManager.goToNextPage()')
        self.wait_for_condition(lambda m: m.find_element('tag name', 'body')
            .get_attribute('data-transitioning') != 'true')

    def _homescreen_has_more_pages(self):
        # the naming of this could be more concise when it's in an app object!
        return self.marionette.execute_script("""
            var pageHelper = window.wrappedJSObject.GridManager.pageHelper;
            return pageHelper.getCurrentPageNumber() < (pageHelper.getTotalPagesNumber() - 1);""")

    def tearDown(self):
        self.apps.uninstall(APP_NAME)
        GaiaTestCase.tearDown(self)
