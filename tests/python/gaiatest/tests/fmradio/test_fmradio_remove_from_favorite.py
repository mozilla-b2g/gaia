# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestFMRadioRemoveFromFavorite(GaiaTestCase):

    _favorite_button_locator = ('id', 'bookmark-button')
    _favorite_list_locator = ('css selector', "div[class='fav-list-frequency']")
    _favorite_remove_locator = ('css selector', "div[class='fav-list-remove-button']")

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the FM Radio app
        self.app = self.apps.launch('FM Radio')

    def test_remove_from_favorite(self):
        """ Remove a station from favorite list

        https://moztrap.mozilla.org/manage/case/1926/

        """
        # check the headphone is plugged-in or not
        self.assertTrue(self.data_layer.is_antenna_available, 'Antenna (headphones) not plugged in')

        # wait for the radio start-up
        self.wait_for_condition(lambda m: self.data_layer.is_fm_radio_enabled)

        # save the initial count of favorite stations
        initial_favorite_count = len(self.marionette.find_elements(*self._favorite_list_locator))

        # add the current frequency to favorite list
        self.wait_for_element_displayed(*self._favorite_button_locator)
        favorite_button = self.marionette.find_element(*self._favorite_button_locator)
        self.marionette.tap(favorite_button)
        self.wait_for_element_displayed(*self._favorite_remove_locator)

        # verify the change of favorite list after add
        after_add_favorite_count = len(self.marionette.find_elements(*self._favorite_list_locator))
        self.assertEqual(initial_favorite_count, after_add_favorite_count - 1)

        # remove the station from favorite list
        favorite_remove = self.marionette.find_element(*self._favorite_remove_locator)
        self.marionette.tap(favorite_remove)

        # verify the change of favorite after remove
        self.wait_for_element_not_displayed(*self._favorite_remove_locator)
        after_remove_favorite_count = len(self.marionette.find_elements(*self._favorite_list_locator))
        self.assertEqual(after_add_favorite_count - 1, after_remove_favorite_count)
