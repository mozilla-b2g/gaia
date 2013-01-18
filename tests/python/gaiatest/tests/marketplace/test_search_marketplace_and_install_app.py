# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from marionette.keys import Keys


class TestSearchMarketplaceAndInstallApp(GaiaTestCase):

    APP_NAME = 'Lanyrd Mobile'
    APP_DEVELOPER = 'Lanyrd'
    APP_INSTALLED = False

    # Marketplace search on home page
    _search_button = ('css selector', '.header-button.icon.search.right')
    _search = ('id', 'search-q')

    # Marketplace search results area and a specific result item
    _search_results_area = ('id', 'search-results')
    _search_result = ('css selector', '#search-results li.item')

    # Marketplace result app name, author, and install button
    _app_name_locator = ('xpath', '//h3')
    _author_locator = ('css selector', '.author.lineclamp.vital')
    _install_button = ('css selector', '.button.product.install')

    # System app confirmation button to confirm installing an app
    _yes_button_locator = ('id', 'app-install-install-button')

    # Label identifier for all homescreen apps
    _app_icon_locator = ('xpath', "//li[@class='icon']//span[text()='%s']" % APP_NAME)
    _homescreen_iframe_locator = ('css selector', 'div.homescreen iframe')

    def setUp(self):
        GaiaTestCase.setUp(self)

        if self.wifi:
            self.data_layer.enable_wifi()
            self.data_layer.connect_to_wifi(self.testvars['wifi'])

        # launch the app
        self.app = self.apps.launch('Marketplace')

    def test_search_and_install_app(self):
        # select to search for an app
        self.wait_for_element_displayed(*self._search_button)
        search_button = self.marionette.find_element(*self._search_button)
        self.marionette.tap(search_button)

        # search for the lanyrd mobile app
        self.wait_for_element_displayed(*self._search)
        search_box = self.marionette.find_element(*self._search)
        search_box.send_keys(self.APP_NAME)
        search_box.send_keys(Keys.RETURN)

        # validate the first result is the official lanyrd mobile app
        self.wait_for_element_displayed(*self._search_results_area)
        results = self.marionette.find_elements(*self._search_result)
        self.assertGreater(len(results), 0, 'no results found')
        app_name = results[0].find_element(*self._app_name_locator)
        author = results[0].find_element(*self._author_locator)
        self.assertEquals(app_name.text, self.APP_NAME, 'First app has wrong name')
        self.assertEquals(author.text, self.APP_DEVELOPER,
                          'First app wrong developer')

        # Find and click the install button to the install the web app
        install_button = results[0].find_element(*self._install_button)
        self.assertEquals(install_button.text, 'Free', 'incorrect button label')
        self.marionette.tap(install_button)

        # Confirm the installation of the web app
        self.marionette.switch_to_frame()

        self.wait_for_element_displayed(*self._yes_button_locator)
        yes_button = self.marionette.find_element(*self._yes_button_locator)
        self.marionette.tap(yes_button)
        self.wait_for_element_not_displayed(*self._yes_button_locator)

        self.APP_INSTALLED = True

        homescreen_frame = self.marionette.find_element(*self._homescreen_iframe_locator)
        self.marionette.switch_to_frame(homescreen_frame)

        # Wait for app's icon to appear on the homescreen
        self.wait_for_element_present(*self._app_icon_locator)

    def tearDown(self):

        if self.APP_INSTALLED:
            self.apps.uninstall(self.APP_NAME)

        GaiaTestCase.tearDown(self)
