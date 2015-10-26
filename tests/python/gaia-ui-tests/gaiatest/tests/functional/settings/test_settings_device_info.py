# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsDeviceInfo(GaiaTestCase):

    def test_that_device_info_is_populated(self):
        settings = Settings(self.marionette)
        settings.launch()
        device_info = settings.open_device_info()

        # devices without sim cards have no phone number
        if self.environment.phone_numbers:
            self.assertNotEqual(device_info.phone_number, '')
            self.assertIsNotNone(device_info.phone_number)
        else:
            self.assertEqual(device_info.phone_number, '')

        for item in ('model', 'software'):
            self.assertNotEqual(getattr(device_info, item), '')

        more_info = device_info.tap_more_info()
        for item in ('os_version', 'hardware_revision', 'mac_address',
                     'iccid', 'platform_version', 'build_id', 'build_number',
                     'update_channel', 'git_commit_timestamp', 'git_commit_hash'):
            self.assertNotEqual(getattr(more_info, item), '', '{} does not have any value'.format(item))

        i = 1
        for expected_imei in self.environment.imei_numbers:
            self.assertEqual(getattr(more_info, 'imei{}'.format(i)), expected_imei)
            i += 1
