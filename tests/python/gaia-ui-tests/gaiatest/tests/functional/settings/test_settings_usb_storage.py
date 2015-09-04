# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestUsbStorage(GaiaTestCase):

    def test_toggle_usb_storage(self):
        """
        https://moztrap.mozilla.org/manage/case/6072/ (partial)
        """
        settings = Settings(self.marionette)
        settings.launch()

        self.assertFalse(settings.is_usb_storage_enabled)
        self.assertFalse(self.data_layer.get_setting('ums.enabled'))

        settings.enable_usb_storage()
        settings.confirm_usb_storage()
        self.assertTrue(settings.is_usb_storage_enabled)
        self.assertTrue(self.data_layer.get_setting('ums.enabled'))

    def tearDown(self):
        self.data_layer.set_setting('ums.enabled', False)
