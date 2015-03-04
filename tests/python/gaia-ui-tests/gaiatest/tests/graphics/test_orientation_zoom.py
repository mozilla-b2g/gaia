# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.tests.graphics.orientation_zoom_base import OrientationZoomBase


class TestGfxSmokeTestOZ(OrientationZoomBase):

    def test_orientation_zoom(self):
        self.orientation_zoom_check()
