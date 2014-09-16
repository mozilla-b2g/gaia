# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.tests.graphics.edit_picture_base import GalleryEditPhotoBase

class TestGalleryEditPhotoComboEffect(GalleryEditPhotoBase):

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)

    def test_gallery_edit_photo_combo(self):
        self.invert(True)
        self.grayscale(True)
        self.contrast("0.5")
        self.gallery_edit_photo()

    def tearDown(self):
        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        GaiaImageCompareTestCase.tearDown(self)
