# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from marionette.marionette_test import parameterized

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsRTL(GaiaImageCompareTestCase):

    @parameterized("disable_USB_storage", 'disable')
    # disabled for jenkins run, since only manual cable disconnect with disable the USB
    # @parameterized("enable_USB_storage", 'enable')
    def test_settings_app(self, options):
        settings = Settings(self.marionette)
        settings.launch()
        ########### USB Storage #############################
        usb_storage = settings.open_usb_storage()
        usb_storage.enable_usb_storage()
        self.take_screenshot('usbstorage-enablewarning')
        # if usb is enabled, it affects media storage menu
        if options == "disable":
            usb_storage.cancel_usb_storage()
            self.assertFalse(usb_storage.enabled)
            self.take_screenshot('usbstorage')
        else:
            usb_storage.confirm_usb_storage()
            self.assertTrue(usb_storage.enabled)
            self.take_screenshot('usbstorage')

        settings.return_to_prev_menu(settings.screen_element, usb_storage.screen_element)

        ########### Media Storage #############################
        # when USB is enabled, need to capture the 'Not Available' text
        mediastorage_page = settings.open_media_storage()
        self.take_screenshot('media_storage')
        if options == "disable":
            mediastorage_page.internal_storage.tap_internal_format()
            self.take_screenshot('media_storage-format_internal')
            mediastorage_page.internal_storage.cancel_format()

            GaiaImageCompareTestCase.scroll(self.marionette, 'down',
                                            mediastorage_page.screen_element.size['height'],
                                            screen = mediastorage_page.screen_element)
            self.take_screenshot('media_storage')
            mediastorage_page.external_storage0.tap_sd_format()
            self.take_screenshot('media_storage-format_SD')
            mediastorage_page.external_storage0.cancel_format()
            mediastorage_page.external_storage0.tap_eject()
            self.take_screenshot('media_storage-eject_SD')
            mediastorage_page.external_storage0.cancel_eject()

            GaiaImageCompareTestCase.scroll(self.marionette, 'down',
                                            mediastorage_page.screen_element.size['height'],
                                            screen = mediastorage_page.screen_element)
            self.take_screenshot('media_storage')
            mediastorage_page.tap_select_media_location()
            self.take_screenshot('media_storage-select_media_loc')
            mediastorage_page.confirm_select_media_location()
            self.take_screenshot('media_storage-media_locations', top_frame=True)
            mediastorage_page.pick_media_location('Internal')
            settings.return_to_prev_menu(settings.screen_element, mediastorage_page.screen_element)

        ########### Application Storage #############################
            settings.open_application_storage()
            self.take_screenshot('application_storage')

    def tearDown(self):
        self.data_layer.set_setting('ums.enabled', False)
