# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.tests.graphics.orientation_zoom_base import OrientationZoomBase

class TestGfxSmokeTestOZGrayScale(OrientationZoomBase):


    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)
        self.data_layer.connect_to_wifi()

    def test_gfx_smoke_test_oz_grayscale(self):

        self.grayscale(True)
        self.orientation_zoom_check()

    def tearDown(self):
        GaiaImageCompareTestCase.tearDown(self)