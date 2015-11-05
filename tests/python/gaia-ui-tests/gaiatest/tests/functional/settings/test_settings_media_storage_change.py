# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings
from gaiatest.apps.camera.app import Camera
from gaiatest.apps.gallery.app import Gallery

class TestSettingsMediaStorageChange(GaiaTestCase):
    def setUp(self):
        GaiaTestCase.setUp(self)
        self.apps.set_permission('Camera', 'geolocation', 'deny')

    def test_settings_media_storage_change(self):
        settings = Settings(self.marionette)
        settings.launch()
        media_storage_settings = settings.open_media_storage()

        # Check that no media is on the device
        self.assertEqual(media_storage_settings.internal_storage.music_size, '0 B')
        self.assertEqual(media_storage_settings.internal_storage.pictures_size, '0 B')
        self.assertEqual(media_storage_settings.internal_storage.movies_size, '0 B')
        self.assertEqual(media_storage_settings.external_storage0.music_size, '0 B')
        self.assertEqual(media_storage_settings.external_storage0.pictures_size, '0 B')
        self.assertEqual(media_storage_settings.external_storage0.movies_size, '0 B')

        self.assertEqual(media_storage_settings.default_media_location, 0)
        media_storage_settings.tap_select_media_location()
        media_storage_settings.confirm_select_media_location()
        media_storage_settings.pick_media_location('SD Card')
        self.assertEqual(media_storage_settings.default_media_location, 1)

        # This is necessary, because otherwise we often fail in take_photo
        # Apparently, the ability of making a photo is very fragile on low memory devices
        self.apps.kill_all()

        # Workaround for bug 1218115 where the camera doesn't launch without this small pause
        import time
        time.sleep(0.5)
        camera = Camera(self.marionette)
        camera.launch()
        camera.take_photo()
        self.assertTrue(camera.is_thumbnail_visible)

        gallery = Gallery(self.marionette)
        gallery.launch()
        gallery.wait_for_files_to_load(1)
        self.assertEqual(gallery.gallery_items_number, 1)

        # Close the settings application. We need to kill it to re-init the UI
        self.apps.kill_all()
        settings.launch()
        media_storage_settings = settings.open_media_storage()

        # Internal sdcard storage should still have no contents
        self.assertEqual(media_storage_settings.internal_storage.music_size, '0 B')
        self.assertEqual(media_storage_settings.internal_storage.pictures_size, '0 B')
        self.assertEqual(media_storage_settings.internal_storage.movies_size, '0 B')

        # External sdcard storage should contain some pictures
        self.assertEqual(media_storage_settings.external_storage0.music_size, '0 B')
        self.assertNotEqual(media_storage_settings.external_storage0.pictures_size, '0 B')
        self.assertEqual(media_storage_settings.external_storage0.movies_size, '0 B')

        media_storage_settings.external_storage0.tap_eject()
        media_storage_settings.external_storage0.confirm_eject()

        gallery = Gallery(self.marionette)
        gallery.launch(True)
        self.assertFalse(gallery.are_gallery_items_displayed)

        self.device.stop_b2g()
        self.device.start_b2g()

        gallery = Gallery(self.marionette)
        gallery.launch()
        gallery.wait_for_files_to_load(1)
        self.assertEqual(gallery.gallery_items_number, 1)
