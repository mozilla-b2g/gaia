# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette.by import By
from gaiatest import GaiaTestCase

from gaiatest.utils.Imagecompare.imagecompare_util import ImageCompareUtil
import sys


class TestVolumeButtonsAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        current_module = str(sys.modules[__name__])
        self.module_name = current_module[current_module.find("'")+1:current_module.find("' from")]
        self.graphics = ImageCompareUtil(self.marionette,'.')

    def test_a11y_volume_buttons(self):

        # Screen reader is currently disabled.
        self.assertFalse(self.data_layer.get_setting('accessibility.screenreader'))

        self.device.press_release_volume_up_then_down_n_times(3)
        time.sleep(3)
        self.device.press_release_volume_up_then_down_n_times(3)

        # Screen reader is now enabled.
        self.assertTrue(self.data_layer.get_setting('accessibility.screenreader'))
        self.graphics.invoke_screen_capture(self.marionette.get_active_frame())

        self.device.press_release_volume_up_then_down_n_times(3)
        time.sleep(3)
        self.device.press_release_volume_up_then_down_n_times(3)

        # Screen reader is disabled again.
        self.assertFalse(self.data_layer.get_setting('accessibility.screenreader'))
        self.graphics.invoke_screen_capture(self.marionette.get_active_frame())

        # Press the volume up/down buttons 2 times, then wait for more than 0.6s
        self.device.press_release_volume_up_then_down_n_times(2)
        time.sleep(0.7)
        self.device.press_release_volume_up_then_down_n_times(4)
        # Screen reader should still be disabled.
        self.assertFalse(self.data_layer.get_setting('accessibility.screenreader'))
        self.graphics.invoke_screen_capture(self.marionette.get_active_frame())

        self.device.press_release_volume_up_then_down_n_times(1)
        # Wait for more than 0.6s after the initial 5 presses.
        time.sleep(0.7)
        self.device.press_release_volume_up_then_down_n_times(1)
        # Screen reader should still be disabled.
        self.assertFalse(self.data_layer.get_setting('accessibility.screenreader'))
        self.graphics.invoke_screen_capture(self.marionette.get_active_frame())

    def tearDown(self):

        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        if (self.testvars['collect_ref_images'] == 'true'):
            # collect screenshots and save it as ref images
            self.graphics.collect_ref_images(self.testvars['screenshot_location'],'.',self.module_name)
        else:
            # pull the screenshots off the device and compare.
            self.graphics.collect_and_compare(self,'.',self.testvars['screenshot_location'] , self.module_name, 5)

        GaiaTestCase.tearDown(self)
