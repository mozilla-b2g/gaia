# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsMediaStorage(GaiaTestCase):

    def test_settings_media_storage(self):

        settings = Settings(self.marionette)
        settings.launch()
        media_storage_settings = settings.open_media_storage_settings()

        # Check that no media is on the device
        self.assertEqual(media_storage_settings.music_size, '0 B')
        self.assertEqual(media_storage_settings.pictures_size, '0 B')
        self.assertEqual(media_storage_settings.movies_size, '0 B')

        # Close the settings application. We need to kill it to re-init the UI
        self.apps.kill(settings.app)

        # Push media to the device
        self.push_resource('VID_0001.3gp', destination='DCIM/100MZLLA')
        self.push_resource('IMG_0001.jpg', destination='DCIM/100MZLLA')
        self.push_resource('MUS_0001.mp3', destination='DCIM/100MZLLA')

        # Access 'Media storage' in Settings
        settings.launch()
        media_storage_settings = settings.open_media_storage_settings()

        # Check that media storage has updated to reflect the newly pushed media
        self.assertEqual(media_storage_settings.music_size, '120 KB')
        self.assertEqual(media_storage_settings.pictures_size, '348 KB')
        self.assertEqual(media_storage_settings.movies_size, '120 KB')
