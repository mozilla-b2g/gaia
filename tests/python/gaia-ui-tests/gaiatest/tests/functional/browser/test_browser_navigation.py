# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import urllib2
from marionette import By
from marionette import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.search.app import Search


class TestBrowserNavigation(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()
        self.apps.set_permission_by_url(Search.manifest_url, 'geolocation', 'deny')

        self.test_url = self.marionette.absolute_url('mozilla.html')

        # Check if the page can be reached on the Marionette web server
        try:
          response = urllib2.urlopen(self.test_url)
        except urllib2.URLError as e:
           raise Exception("Could not get %s: %s" % (self.test_url, e.reason))

    def test_browser_back_button(self):
        search = Search(self.marionette)
        search.launch()
        browser = search.go_to_url(self.test_url)

        browser.switch_to_content()
        Wait(self.marionette).until(lambda m: m.title == 'Mozilla')
        link = self.marionette.find_element(By.CSS_SELECTOR, '#community a')
        # TODO: remove the explicit scroll once bug 833370 is fixed
        self.marionette.execute_script(
            'arguments[0].scrollIntoView(false);', [link])
        link.tap()
        Wait(self.marionette).until(lambda m: m.title == 'Mozilla Community')

        browser.switch_to_chrome()
        browser.tap_back_button()
        browser.switch_to_content()
        Wait(self.marionette).until(lambda m: m.title == 'Mozilla')

        browser.switch_to_chrome()
        browser.tap_forward_button()
        browser.switch_to_content()
        Wait(self.marionette).until(lambda m: m.title == 'Mozilla Community')
