# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.tests.graphics.edit_picture_base import GalleryEditPhotoBase


class TestGalleryEditPhoto(GalleryEditPhotoBase):

    def test_edit_picture(self):
        self.gallery_edit_photo('IMG_0001.jpg')
