# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestGallery(GaiaTestCase):

    _gallery_items_locator = ('css selector', 'li.thumbnail')
    _current_image_locator = ('css selector', '#frame2 > img')
    _photos_toolbar_locator = ('id', 'fullscreen-toolbar')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # add photo to storage
        self.push_resource('IMG_0001.jpg', 'DCIM/100MZLLA')

        # launch the Gallery app
        self.app = self.apps.launch('Gallery')

    def test_gallery_view(self):
        # https://moztrap.mozilla.org/manage/case/1326/

        self.wait_for_element_displayed(*self._gallery_items_locator)

        gallery_items = self.marionette.execute_script("return window.wrappedJSObject.files;")
        for index, item in enumerate(gallery_items):
            # If the current item is not a video, set it as the gallery item to tap.
            if 'video' not in item['metadata']:
                first_gallery_item = self.marionette.find_elements(*self._gallery_items_locator)[index]
                break

        self.marionette.tap(first_gallery_item)

        current_image = self.marionette.find_element(*self._current_image_locator)
        photos_toolbar = self.marionette.find_element(*self._photos_toolbar_locator)

        self.wait_for_element_displayed(*self._current_image_locator)
        self.assertIsNotNone(current_image.get_attribute('src'))
        self.assertTrue(photos_toolbar.is_displayed())

        # TODO
        # Add steps to view picture full screen
        # TODO
        # Repeat test with landscape orientation
