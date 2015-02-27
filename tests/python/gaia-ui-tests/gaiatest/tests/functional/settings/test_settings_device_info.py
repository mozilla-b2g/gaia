# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsDeviceInfo(GaiaTestCase):

    def test_that_device_info_is_populated(self):
        settings = Settings(self.marionette)
        settings.launch()
        device_info = settings.open_device_info_settings()

        # devices without sim cards have no phone number
        if self.environment.phone_numbers:
            self.assertTrue(len(device_info.phone_number) > 0)
            self.assertIsNotNone(device_info.phone_number)
        else:
            self.assertEqual(device_info.phone_number, '')

        # verify fields on the main page
        for item in ('model', 'software'):
            self.assertTrue(len(getattr(device_info, item)) > 0)

        # open more info panel and check that fields are populated
        more_info = device_info.tap_more_info()
        for item in ('os_version', 'hardware_revision', 'mac_address', 'imei1', 'imei2',
                     'iccid', 'platform_version', 'build_id', 'build_number',
                     'update_channel', 'git_commit_timestamp', 'git_commit_hash'):
            self.assertTrue(len(getattr(more_info, item)) > 0)
        self.assertEqual(more_info.imei1, self.environment.imei_numbers[0])
        self.assertEqual(more_info.imei2, self.environment.imei_numbers[1])
