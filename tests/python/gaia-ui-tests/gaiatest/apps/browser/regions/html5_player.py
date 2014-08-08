# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest.apps.base import PageRegion


class HTML5Player(PageRegion):
    """Represents HTML5 Player.

    Reference:
    http://www.w3.org/TR/2012/WD-html5-20121025/media-elements.html#media-element
    """

    def wait_for_video_loaded(self):
        self.wait_for_condition(
            lambda m:
            int(self.root_element.get_attribute('readyState')) == 4)

    @property
    def is_paused(self):
        return self.marionette.execute_script('return arguments[0].paused;', [self.root_element])

    @property
    def is_ended(self):
        return self.marionette.execute_script('return arguments[0].ended;', [self.root_element])

    def wait_for_video_playing(self):
        self.wait_for_condition(lambda m: self.is_video_playing())

    def is_video_playing(self):
        # get 4 timestamps during approx. 1 sec
        # ensure that newer timestamp has greater value than previous one
        timestamps = []
        for i in range(4):
            timestamps.append(self.current_timestamp)
            time.sleep(.25)
        return all([timestamps[i - 1] < timestamps[i] for i in range(1, 3)])

    @property
    def current_timestamp(self):
        return float(self.marionette.execute_script('return arguments[0].currentTime;', [self.root_element]))
