# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from marionette.marionette_test import parameterized

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsRTL(GaiaImageCompareTestCase):

    @parameterized("disable_USB_storage", 'disable')
    @parameterized("enable_USB_storage", 'enable')
    def test_settings_app(self, options):
        settings = Settings(self.marionette)
        settings.launch()
        ########### USB Storage #############################
        settings.wait_for_usb_storage_toggle_ready()
        settings.toggle_usb_storage()
        self.take_screenshot('usbstorage-enablewarning')
        # if usb is enabled, it affects media storage menu
        if options == "disable":
            settings.cancel_usb_storage()
        else:
            settings.confirm_usb_storage()

        ########### Media Storage #############################
        # when USB is enabled, need to capture the 'Not Available' text
        mediastorage_page = settings.open_media_storage()
        self.take_screenshot('media_storage')
        for i in range(0, 2):
            GaiaImageCompareTestCase.scroll(self.marionette, 'down',
                                            mediastorage_page.screen_element.size['height'],
                                            screen=mediastorage_page.screen_element)
            self.take_screenshot('media_storage')

        if options == "disable":
            mediastorage_page.tap_format_internal_storage()
            self.take_screenshot('media_storage-format_internal')
            mediastorage_page.cancel_format_storage()
            mediastorage_page.tap_format_SD()
            self.take_screenshot('media_storage-format_SD')
            mediastorage_page.cancel_format_storage()
            mediastorage_page.tap_select_media_location()
            self.take_screenshot('media_storage-select_media_loc')
            mediastorage_page.confirm_select_media_location()
            self.take_screenshot('media_storage-media_locations')
            mediastorage_page.pick_media_location('Internal')
            settings.return_to_prev_menu(settings.screen_element)

        ########### Application Storage #############################
            settings.open_application_storage()
            self.take_screenshot('application_storage')
 