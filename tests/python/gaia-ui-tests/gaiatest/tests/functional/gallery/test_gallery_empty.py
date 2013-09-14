# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery


class TestGalleryEmpty(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

    def test_empty_gallery(self):
        # https://moztrap.mozilla.org/manage/case/4003/
        # Requires there to be no photos on SDCard which is the default

        gallery = Gallery(self.marionette)
        gallery.launch()

        # Verify empty gallery title
        self.assertEqual(gallery.empty_gallery_title, 'No photos or videos')

        # Verify empty gallery text
        self.assertEqual(gallery.empty_gallery_text, 'Use the Camera app to get started.')
