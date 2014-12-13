# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


from marionette import By
from marionette import Wait
from marionette.marionette import Actions

from gaiatest import GaiaTestCase
from gaiatest.apps.search.app import Search
from gaiatest.apps.system.regions.activities import Activities

class TestBrowserPrivateWindow(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()
        self.apps.set_permission_by_url(Search.manifest_url, 'geolocation', 'deny')

        self.test_url = self.marionette.absolute_url('mozilla.html')

    def test_browser_context_menu(self):
        search = Search(self.marionette)
        search.launch()
        browser = search.go_to_url(self.test_url)

        browser.switch_to_content()
        Wait(self.marionette).until(lambda m: m.title == 'Mozilla')

        link = self.marionette.find_element(By.CSS_SELECTOR, '#community a')
        Actions(self.marionette).\
            press(link).\
            wait(3).\
            release().\
            wait(1).\
            perform()
        activities = Activities(self.marionette)

        activities.tap_open_in_new_private_window()

        Wait(self.marionette).until(lambda m: "mozilla_community.html" in browser.apps.displayed_app.src)
