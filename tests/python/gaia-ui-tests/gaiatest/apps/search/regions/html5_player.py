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
        # Wait a bit longer to makes sure enough of the video has been loaded
        self.wait_for_condition(
            lambda m:
            int(self.root_element.get_attribute('readyState')) == 4, 10)

    @property
    def is_fullscreen(self):
        return self.marionette.execute_script(
                   'return document.mozFullScreen',
                   script_args=[self.root_element])

    @property
    def is_playing(self):
        return self.root_element.get_attribute('paused') != 'true'

    @property
    def is_muted(self):
        return self.root_element.get_attribute('muted') == 'true'

    @property
    def is_ended(self):
        return self.root_element.get_attribute('ended') == 'true'

    def set_loop(self, bool):
        if bool:
          script = 'arguments[0].loop = true';
        else:
          script = 'arguments[0].loop = false';
        self.marionette.execute_script(script, script_args=[self.root_element])

    def invoke_controls(self):
        self.root_element.tap()
        time.sleep(0.25)

    def tap_video_control(self, class_name):
        location = self.marionette.execute_script("""
           var a = SpecialPowers.Cc["@mozilla.org/inspector/dom-utils;1"]
               .getService(SpecialPowers.Ci.inIDOMUtils).getChildrenForNode(document.getElementsByTagName('video')[0], true);
           var x1 = document.getElementsByTagName('video')[0].getBoundingClientRect().left;
           var x2 = a[1].ownerDocument.getAnonymousElementByAttribute(a[1],'class', '%s').getBoundingClientRect().left;
           var y1 = document.getElementsByTagName('video')[0].getBoundingClientRect().top;
           var y2 = a[1].ownerDocument.getAnonymousElementByAttribute(a[1],'class', '%s').getBoundingClientRect().top;
           return (Math.floor(x2-x1) + ',' + Math.floor(y2-y1));
         """ % (class_name, class_name)).split(',')
        self.root_element.tap(x=int(location[0])+5, y=int(location[1])+5)

    def tap_play(self, bool):
        self.tap_video_control('playButton')
        self.wait_for_condition(lambda m: self.is_playing == bool)

    def tap_mute(self, bool):
        self.tap_video_control('muteButton')
        self.wait_for_condition(lambda m: self.is_muted == bool)

    def tap_full_screen(self):
        self.tap_video_control('fullscreenButton')
        time.sleep(0.5)

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
        return float(self.root_element.get_attribute('currentTime'))
