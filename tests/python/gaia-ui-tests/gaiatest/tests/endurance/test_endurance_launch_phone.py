# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: 27 minutes

from gaiatest import GaiaEnduranceTestCase
import time


class TestEnduranceLaunchPhone(GaiaEnduranceTestCase):

    def test_endurance_launch_phone(self):
        self.drive(test=self.launch_phone, app='phone')

    def launch_phone(self):
       self.app = self.apps.launch('Phone')
       time.sleep(5)
       self.apps.kill(self.app)
       time.sleep(5)
