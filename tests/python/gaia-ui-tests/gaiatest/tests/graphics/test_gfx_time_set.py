# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.tests.graphics.set_time import SetTime

class TestTimeChange(GaiaImageCompareTestCase):

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)

    def test_gfx_time_set(self):
        x = SetTime(self.marionette)
        x.open_settings()
        x.set_time('3','23','AM')
        self.invoke_screen_capture()
        x.set_date('March','29','1976')
        x.close_settings()

    def tearDown(self):
        GaiaImageCompareTestCase.tearDown(self)