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

        usb_storage = settings.open_usb_storage()

        self.assertFalse(usb_storage.enabled)
        self.assertFalse(self.data_layer.get_setting('ums.enabled'))

        usb_storage.enable_usb_storage()
        usb_storage.confirm_usb_storage()
        self.assertTrue(usb_storage.enabled)
        self.assertTrue(self.data_layer.get_setting('ums.enabled'))

    def tearDown(self):
        self.data_layer.set_setting('ums.enabled', False)
