# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from marionette.marionette import Actions


class TestEdgeGestures(GaiaTestCase):

    _apps_under_test = ['Phone', 'Contacts']

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.data_layer.set_setting('edgesgesture.enabled', True)

        for i in self._apps_under_test:
            self.apps.launch(i)
            # Sleep for stability issue of trying to launch apps too fast
            time.sleep(1)

    def test_edge_gestures(self):
        '''
        Test swiping between apps with edge gestures
        As this is non-default (ie pref set) Gaia behaviour I have eschewed app objects
        '''

        # Swipe to the left on the displayed frame
        displayed_frame = self.apps.displayed_app.frame
        action = Actions(self.marionette)
        action.flick(displayed_frame, 0, 100, -200, 0, 50).perform()

        self.wait_for_condition(lambda m: self.apps.displayed_app.name == self._apps_under_test[0])

        # Swipe to the right
        displayed_frame = self.apps.displayed_app.frame
        action = Actions(self.marionette)
        action.flick(displayed_frame, displayed_frame.size['width'], 100, 200, 0, 50).perform()

        self.wait_for_condition(lambda m: self.apps.displayed_app.name == self._apps_under_test[1])
