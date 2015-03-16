# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsFindMyDevice(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

    def test_findmydevice(self):
        """
        Partial implementation of:
        https://moztrap.mozilla.org/manage/case/13663/
        """

        # Rerunning this test >10 times after each other will result in failures, see:
        # https://bugzilla.mozilla.org/show_bug.cgi?id=1112334#c7
        settings = Settings(self.marionette)
        settings.launch()
        findmydevice = settings.open_findmydevice()

        fxaccount = findmydevice.tap_login()
        fxaccount.enter_email(self.environment.email['gmail']['email'])
        fxaccount.enter_password(self.environment.email['gmail']['password'])
        fxaccount.tap_done()

        findmydevice.wait_for_enable_switch_to_be_turned_on()
