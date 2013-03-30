# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestFMRadioAddToFavorite(GaiaTestCase):

    _frequency_display_locator = ('id', 'frequency')
    _favorite_button_locator = ('id', 'bookmark-button')
    _favorite_list_locator = ('css selector', "div[class='fav-list-frequency']")
    _favorite_remove_locator = ('css selector', "div[class='fav-list-remove-button']")

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the FM Radio app
        self.app = self.apps.launch('FM Radio')

    def test_add_to_favorite(self):
        """ Add a frequency to favorite list

        https://moztrap.mozilla.org/manage/case/1923/

        """
        # check the headphone is plugged-in or not
        self.assertTrue(self.data_layer.is_antenna_available, 'Antenna (headphones) not plugged in')

        # wait for the radio start-up
        self.wait_for_condition(lambda m: self.data_layer.is_fm_radio_enabled)

        # save the initial count of favorite stations
        initial_favorite_count = len(self.marionette.find_elements(*self._favorite_list_locator))

        # save the current frequency
        current_frequency = self.marionette.find_element(*self._frequency_display_locator).text

        # check the ui value and the system value
        self.assertEqual(current_frequency, str(self.data_layer.fm_radio_frequency))

        # add the current frequency to favorite list
        favorite_button = self.marionette.find_element(*self._favorite_button_locator)
        self.marionette.tap(favorite_button)

        # verify the change of favorite list
        self.wait_for_element_displayed(*self._favorite_list_locator)
        favorite_list = self.marionette.find_elements(*self._favorite_list_locator)
        new_favorite_count = len(favorite_list)
        self.assertEqual(initial_favorite_count, new_favorite_count - 1)

        # verify the favorite frequency is equal to the current frequency
        favorite_frequency = favorite_list[0].text
        self.assertEqual(current_frequency, favorite_frequency)

    def tearDown(self):
        # remove the station from favorite list
        self.wait_for_element_displayed(*self._favorite_remove_locator)
        favorite_remove = self.marionette.find_element(*self._favorite_remove_locator)
        self.marionette.tap(favorite_remove)

        GaiaTestCase.tearDown(self)
