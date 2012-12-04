# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
import time


class TestGallery(GaiaTestCase):

    _throbber_locator = ('id', 'throbber')
    _gallery_items_locator = ('css selector', 'li.thumbnail')
    _current_image_locator = ('css selector', '#frame2 > img')
    _photos_toolbar_locator = ('id', 'photos-toolbar')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # unlock the lockscreen if it's locked
        self.lockscreen.unlock()

        # launch the Gallery app
        self.app = self.apps.launch('Gallery')

    def test_gallery_view(self):
        # https://moztrap.mozilla.org/manage/case/1326/

        # throbber is throbbing forever
        self.wait_for_element_displayed(*self._gallery_items_locator)

        self.marionette.find_elements(*self._gallery_items_locator)[0].click()

        current_image = self.marionette.find_element(*self._current_image_locator)

        self.wait_for_element_displayed(*self._current_image_locator)
        self.assertIsNotNone(current_image.get_attribute('src'))

        # TODO
        # Add steps to view picture full screen
        # TODO
        # Repeat test with landscape orientation

    def tearDown(self):

        # close the app
        if self.app:
            self.apps.kill(self.app)

        GaiaTestCase.tearDown(self)
