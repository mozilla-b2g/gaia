# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery
from gaiatest.utils.Imagecompare.imagecompare_util import ImageCompareUtil
import sys
from marionette import By
import pdb


class testGfxSmokeTestDragDrop(GaiaTestCase):


    def setUp(self):
        GaiaTestCase.setUp(self)
        # Add photos to storage.
        self.push_resource(self.images, count=self.image_count)

        current_module = str(sys.modules[__name__])
        self.module_name = current_module[current_module.find("'")+1:current_module.find("' from")]
        self.graphics = ImageCompareUtil(self.marionette,self.apps, self,'.')


    def test_gfx_smoke_test_drag_drop(self):

       # launch gallery, load image.
        gallery = Gallery(self.marionette)
        gallery.launch()
       # select edit button
       # perform edit commands, change orientation
       # save picture, view it in gallery