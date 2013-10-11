# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By

from gaiatest import GaiaTestCase


class TestFtu(GaiaTestCase):

    _next_button_locator = (By.ID, 'forward')

    _section_languages_locator = (By.ID, 'languages')
    _section_cell_data_locator = (By.ID, 'data_3g')
    _section_wifi_locator = (By.ID, 'wifi')
    _found_wifi_networks_locator = (By.CSS_SELECTOR, 'ul#networks-list li')
    _section_date_time_locator = (By.ID, 'date_and_time')
    _section_geolocation_locator = (By.ID, 'geolocation')
    _section_import_contacts_locator = (By.ID, 'import_contacts')
    _section_ayr_locator = (By.ID, 'about-your-rights')
    _section_welcome_browser_locator = (By.ID, 'welcome_browser')
    _section_browser_privacy_locator = (By.ID, 'browser_privacy')
    _section_finish_locator = (By.ID, 'finish-screen')

    _take_tour_button_locator = (By.ID, 'lets-go-button')

    # Section Tour
    _step1_header_locator = (By.ID, 'step1Header')
    _step2_header_locator = (By.ID, 'step2Header')
    _step3_header_locator = (By.ID, 'step3Header')
    _step4_header_locator = (By.ID, 'step4Header')
    _step5_header_locator = (By.ID, 'step5Header')
    _tour_next_button_locator = (By.ID, 'forwardTutorial')
    _tour_back_button_locator = (By.ID, 'backTutorial')

    # Section Tutorial Finish
    _section_tutorial_finish_locator = (By.ID, 'tutorialFinish')
    _lets_go_button_locator = (By.ID, 'tutorialFinished')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the First Time User app
        self.app = self.apps.launch('FTU')

        self.wait_for_condition(lambda m: self.data_layer.is_wifi_enabled)

    def test_ftu_with_tour(self):

        # Go through the FTU setup as quickly as possible to get to the Tour section
        self.wait_for_element_displayed(*self._section_languages_locator)
        # Tap next
        self.marionette.find_element(*self._next_button_locator).tap()
        self.wait_for_element_displayed(*self._section_cell_data_locator)
        # Tap next
        self.marionette.find_element(*self._next_button_locator).tap()
        self.wait_for_element_displayed(*self._section_wifi_locator)
        # The scanning for networks messes with the timing of taps
        self.wait_for_condition(lambda m: len(m.find_elements(*self._found_wifi_networks_locator)) > 0)
        # Tap next
        self.marionette.find_element(*self._next_button_locator).tap()
        self.wait_for_element_displayed(*self._section_date_time_locator)
        # Tap next
        self.marionette.find_element(*self._next_button_locator).tap()
        self.wait_for_element_displayed(*self._section_geolocation_locator)
        # Tap next
        self.marionette.find_element(*self._next_button_locator).tap()
        self.wait_for_element_displayed(*self._section_import_contacts_locator)
        # Tap next
        self.marionette.find_element(*self._next_button_locator).tap()
        self.wait_for_element_displayed(*self._section_welcome_browser_locator)
        # Tap next
        self.marionette.find_element(*self._next_button_locator).tap()
        self.wait_for_element_displayed(*self._section_browser_privacy_locator)
        # Tap next
        self.marionette.find_element(*self._next_button_locator).tap()
        self.wait_for_element_displayed(*self._section_finish_locator)

        # Take the tour
        self.marionette.find_element(*self._take_tour_button_locator).tap()

        # Walk through the tour
        self.wait_for_element_displayed(*self._step1_header_locator)
        self.assertEqual(self.marionette.find_element(*self._step1_header_locator).text,
                         "Swipe from right to left to browse your apps.")

        # First time we see the next button we need to wait for it
        self.wait_for_element_displayed(*self._tour_next_button_locator)
        self.marionette.find_element(*self._tour_next_button_locator).tap()

        self.wait_for_element_displayed(*self._step2_header_locator)
        self.assertEqual(self.marionette.find_element(*self._step2_header_locator).text,
                         "Tap and hold on an icon to delete or move it.")
        self.marionette.find_element(*self._tour_next_button_locator).tap()

        self.wait_for_element_displayed(*self._step3_header_locator)
        self.assertEqual(self.marionette.find_element(*self._step3_header_locator).text,
                         "Enter any keyword or topic and your phone will instantly adapt.")
        self.marionette.find_element(*self._tour_next_button_locator).tap()

        self.wait_for_element_displayed(*self._step4_header_locator)
        self.assertEqual(self.marionette.find_element(*self._step4_header_locator).text,
                         "Swipe down to access recent notifications, credit information and settings.")
        self.marionette.find_element(*self._tour_next_button_locator).tap()

        self.wait_for_element_displayed(*self._step5_header_locator)
        self.assertEqual(self.marionette.find_element(*self._step5_header_locator).text,
                         "Tap and hold the home button to browse and close recent apps.")

        # Try going back a step
        self.marionette.find_element(*self._tour_back_button_locator).tap()
        self.wait_for_element_displayed(*self._step4_header_locator)
        self.marionette.find_element(*self._tour_next_button_locator).tap()
        self.wait_for_element_displayed(*self._step5_header_locator)
        self.marionette.find_element(*self._tour_next_button_locator).tap()

        self.wait_for_element_displayed(*self._section_tutorial_finish_locator)
        self.marionette.find_element(*self._lets_go_button_locator).tap()

        # Switch back to top level now that FTU app is gone
        self.marionette.switch_to_frame()
