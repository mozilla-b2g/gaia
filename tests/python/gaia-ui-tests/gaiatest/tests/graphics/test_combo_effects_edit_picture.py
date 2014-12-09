# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.tests.graphics.edit_picture_base import GalleryEditPhotoBase


class TestGalleryEditPhotoComboEffect(GalleryEditPhotoBase):

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)

    def test_combo_effects_edit_picture(self):
        self.data_layer.set_bool_pref('layers.effect.invert', True)
        self.data_layer.set_bool_pref('layers.effect.grayscale', True)
        self.data_layer.set_char_pref('layers.effect.contrast', "0.5")
        self.gallery_edit_photo('IMG_0001.jpg')

    def tearDown(self):
        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        GaiaImageCompareTestCase.tearDown(self)
