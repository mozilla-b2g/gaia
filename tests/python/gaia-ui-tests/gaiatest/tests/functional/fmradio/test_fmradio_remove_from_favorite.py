# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.fmradio.app import FmRadio


class TestFMRadioRemoveFromFavorite(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the FM Radio app
        self.fm_radio = FmRadio(self.marionette)
        self.fm_radio.launch()

    def test_remove_from_favorite(self):
        """ Remove a station from favorite list

        https://moztrap.mozilla.org/manage/case/1926/

        """
        # check the headphone is plugged-in or not
        self.assertTrue(self.data_layer.is_antenna_available, 'Antenna (headphones) not plugged in')

        # wait for the radio start-up
        self.wait_for_condition(lambda m: self.data_layer.is_fm_radio_enabled)

        # add the current frequency to favorite list
        self.fm_radio.tap_add_favorite()

        # verify the change of favorite list after add
        self.assertEqual(1, len(self.fm_radio.favorite_channels))

        # remove the station from favorite list
        self.fm_radio.favorite_channels[0].remove()

        # verify the change of favorite after remove
        self.assertEqual(0, len(self.fm_radio.favorite_channels))

    def tearDown(self):
        # remove the station from favorite list
        for favorite_channel in self.fm_radio.favorite_channels:
            favorite_channel.remove()

        GaiaTestCase.tearDown(self)
