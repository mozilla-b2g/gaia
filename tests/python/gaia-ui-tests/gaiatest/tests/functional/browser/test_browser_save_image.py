# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver.marionette import Actions

from gaiatest import GaiaTestCase
from gaiatest.apps.search.app import Search
from gaiatest.apps.system.regions.activities import Activities
from gaiatest.apps.system.app import System


class TestBrowserSaveImage(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

        self.test_url = self.marionette.absolute_url('IMG_0001.jpg')

    def test_browser_save_image(self):
        """
        https://moztrap.mozilla.org/manage/case/6889/
        """

        # Check that there are no images on sdcard before saving
        self.assertEqual(0, len(self.data_layer.sdcard_files('.jpeg')))

        search = Search(self.marionette)
        search.launch()

        browser = search.go_to_url(self.test_url)
        browser.switch_to_content()

        # Long tap on the image inside the browser content
        image = self.marionette.find_element('css selector', 'img')
        Actions(self.marionette).\
            press(image).\
            wait(3).\
            release().\
            wait(1).\
            perform()

        activities = Activities(self.marionette)
        activities.tap_save_image()

        system = System(self.marionette)
        system.wait_for_notification_toaster_displayed()
        system.wait_for_notification_toaster_not_displayed()

        self.assertEqual(1, len(self.data_layer.sdcard_files('.jpeg')))
