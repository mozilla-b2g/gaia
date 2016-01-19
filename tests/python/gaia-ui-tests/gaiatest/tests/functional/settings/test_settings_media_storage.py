# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsMediaStorage(GaiaTestCase):

    def test_settings_media_storage(self):

        settings = Settings(self.marionette)
        settings.launch()
        media_storage_settings = settings.open_media_storage()

        # Check that no media is on the internal sdcard
        self.assertEqual(media_storage_settings.internal_storage.music_size, u'{"size":"0","unit":"B"}')
        self.assertEqual(media_storage_settings.internal_storage.pictures_size, u'{"size":"0","unit":"B"}')
        self.assertEqual(media_storage_settings.internal_storage.movies_size, u'{"size":"0","unit":"B"}')

        # Close the settings application. We need to kill it to re-init the UI
        self.apps.kill(settings.app)

        # Push media to the device
        self.push_resource('VID_counter.3gp')
        self.push_resource('IMG_0001.jpg')
        self.push_resource('MUS_0001.mp3')

        # Access 'Media storage' in Settings
        settings.launch()
        media_storage_settings = settings.open_media_storage()

        # Check that media storage has updated to reflect the newly pushed media
        self.assertEqual(media_storage_settings.internal_storage.music_size, u'{"size":"120","unit":"KB"}')
        self.assertEqual(media_storage_settings.internal_storage.pictures_size, u'{"size":"348","unit":"KB"}')
        self.assertEqual(media_storage_settings.internal_storage.movies_size, u'{"size":"680","unit":"KB"}')
