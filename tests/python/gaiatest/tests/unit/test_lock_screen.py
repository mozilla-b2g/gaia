# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestLockScreen(GaiaTestCase):

    def test_lock_unlock(self):
        self.lockscreen.lock()
        self.lockscreen.unlock()
