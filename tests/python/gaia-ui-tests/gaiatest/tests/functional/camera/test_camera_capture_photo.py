# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.camera.app import Camera


class TestCamera(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Turn off geolocation prompt
        self.apps.set_permission('Camera', 'geolocation', 'deny')

    def test_capture_a_photo(self):
        # https://moztrap.mozilla.org/manage/case/1325/

        self.camera = Camera(self.marionette)
        self.camera.launch()

        self.camera.take_photo()

        if not self.camera.is_filmstrip_visible:
            self.camera.tap_to_display_filmstrip()

        image_preview = self.camera.filmstrip_images[0].tap()
        self.assertTrue(image_preview.is_image_preview_visible)
