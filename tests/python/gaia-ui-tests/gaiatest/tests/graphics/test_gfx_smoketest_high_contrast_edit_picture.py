# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.tests.graphics.edit_picture_base import GalleryEditPhotoBase

class TestGalleryEditPhotoHC(GalleryEditPhotoBase):

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)

    def test_gallery_edit_photo_high_contrast(self):
        self.contrast("0.7")
        self.gallery_edit_photo()

    def tearDown(self):
        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        GaiaImageCompareTestCase.tearDown(self)
