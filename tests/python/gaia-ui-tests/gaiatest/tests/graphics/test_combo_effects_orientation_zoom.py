# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.tests.graphics.orientation_zoom_base import OrientationZoomBase


class TestGfxSmokeTestOZComboEffects(OrientationZoomBase):

    def test_combo_effects_orientation_zoom(self):

        self.data_layer.set_bool_pref('layers.effect.invert', True)
        self.data_layer.set_bool_pref('layers.effect.grayscale', True)
        self.data_layer.set_char_pref('layers.effect.contrast', "0.5")

        self.orientation_zoom_check()
