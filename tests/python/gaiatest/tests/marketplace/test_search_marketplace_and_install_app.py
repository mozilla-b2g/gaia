# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from marionette.keys import Keys


APP_NAME = 'Lanyrd Mobile'
APP_DEVELOPER = 'Lanyrd'


class TestSearchMarketplaceAndInstallApp(GaiaTestCase):

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
    _icons_locator = ('css selector', '.labelWrapper')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # unlock the lockscreen if it's locked
        self.lockscreen.unlock()

        self.data_layer.enable_wifi()
        self.data_layer.connect_to_wifi(self.testvars['wifi'])

        # launch the app
        self.app = self.apps.launch('Marketplace')

    def test_search_and_install_app(self):
        # select to search for an app
        self.wait_for_element_displayed(*self._search_button)
        self.marionette.find_element(*self._search_button).click()

        # search for the lanyrd mobile app
        self.wait_for_element_displayed(*self._search)
        search_box = self.marionette.find_element(*self._search)
        search_box.send_keys(APP_NAME)
        search_box.send_keys(Keys.RETURN)

        # validate the first result is the official lanyrd mobile app
        self.wait_for_element_displayed(*self._search_results_area)
        results = self.marionette.find_elements(*self._search_result)
        self.assertGreater(len(results), 0, 'no results found')
        app_name = results[0].find_element(*self._app_name_locator)
        author = results[0].find_element(*self._author_locator)
        self.assertEquals(app_name.text, APP_NAME, 'First app has wrong name')
        self.assertEquals(author.text, APP_DEVELOPER,
            'First app wrong developer')

        # Find and click the install button to the install the web app
        install_button = results[0].find_element(*self._install_button)
        self.assertEquals(install_button.text, 'Free', 'incorrect button label')
        install_button.click()

        # Confirm the installation of the web app
        self.marionette.switch_to_frame()
        self.wait_for_element_displayed(*self._yes_button_locator)
        self.marionette.find_element(*self._yes_button_locator).click()

        self.marionette.switch_to_frame()

        # Wait for app install to complete in the homescreen
        def wait_for_install_to_complete(marionette):
            labels = marionette.find_elements(*self._icons_locator)      
            matches = [lb for lb in labels if lb.text == APP_NAME[:12]]
            return len(matches) == 1
        
        self.wait_for_condition(wait_for_install_to_complete)

    def tearDown(self):

        # close the app
        if self.app:
            self.apps.kill(self.app)

        self.data_layer.disable_wifi()
        self.apps.uninstall(APP_NAME)
        GaiaTestCase.tearDown(self)

