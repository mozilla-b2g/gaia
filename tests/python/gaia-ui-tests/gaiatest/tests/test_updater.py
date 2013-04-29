# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
import unittest


class TestUpdater(GaiaTestCase):

    _device_info_link = ('css selector', "a[data-l10n-id='deviceInfo']")

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the Settings app
        self.app = self.apps.launch('Settings')

    # TODO finish this test as per https://github.com/zacc/gaia-ui-tests/issues/5
    def test_ota_update(self):
        # https://moztrap.mozilla.org/manage/case/2313/

        # Device information
        self.marionette.find_element(*self._device_info_link).click()

        # Click check now

        # wait for 'Checking for updates' to clear

        # Confirm that ui journey is complete
