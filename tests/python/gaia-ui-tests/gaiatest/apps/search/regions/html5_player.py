# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from marionette import expected
from marionette import Wait
from marionette.by import By
from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class HTML5Player(PageRegion):
    """Represents HTML5 Player.

    Reference:
    http://www.w3.org/TR/2012/WD-html5-20121025/media-elements.html#media-element
    """

    _video_element_locator = (By.TAG_NAME, 'video')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.root_element = Wait(self.marionette).until(
            expected.element_present(*self._video_element_locator))
        Wait(self.marionette).until(expected.element_displayed(self.root_element))

    def wait_for_video_loaded(self):
        # Wait long enough to make sure enough of the video has been loaded
        Wait(self.marionette, timeout=60).until(
            lambda m: int(self.root_element.get_attribute('readyState')) == 4)

    @property
    def is_fullscreen(self):
        return self.marionette.execute_script("""return document.mozFullScreenElement ==
                                                 document.getElementsByTagName("video")[0]""")

    @property
    def is_playing(self):
        return self.root_element.get_attribute('paused') != 'true'

    @property
    def is_muted(self):
        return self.root_element.get_attribute('muted') == 'true'

    @property
    def is_ended(self):
        return self.root_element.get_attribute('ended') == 'true'

    @property
    def controls_visible(self):
        return (int(self.get_location('playButton')[0]) > 0)

    def invoke_controls(self):
        Wait(self.marionette).until(lambda m: self.controls_visible is False)
        self.root_element.tap()
        Wait(self.marionette).until(lambda m: self.controls_visible)

    def get_location(self, class_name):
        return self.marionette.execute_script("""
           var a = SpecialPowers.Cc["@mozilla.org/inspector/dom-utils;1"]
               .getService(SpecialPowers.Ci.inIDOMUtils)
               .getChildrenForNode(document.getElementsByTagName('video')[0], true);
           var x1 = document.getElementsByTagName('video')[0].getBoundingClientRect().left;
           var x2 = a[1].ownerDocument
                        .getAnonymousElementByAttribute(a[1],'class', '%s')
                        .getBoundingClientRect().left;
           var y1 = document.getElementsByTagName('video')[0]
                            .getBoundingClientRect().top;
           var y2 = a[1].ownerDocument.getAnonymousElementByAttribute(a[1],'class', '%s')
                        .getBoundingClientRect().top;
           return (Math.floor(x2-x1) + ',' + Math.floor(y2-y1));
         """ % (class_name, class_name)).split(',')

    def tap_video_control(self, class_name):
        location = self.get_location(class_name)
        if location[0] <= 0 or location[1] <= 0:
            print 'x=%d, y=%d' % (location[0], location[1])
            self.assertTrue(False)
        self.root_element.tap(x=int(location[0])+5, y=int(location[1])+5)

    def tap_play(self):
        self.tap_video_control('playButton')
        Wait(self.marionette).until(lambda m: self.is_playing is True)
        # Tapping the play button makes the controls disappear, wait for that to happen
        Wait(self.marionette).until(lambda m: self.controls_visible is False)

    def tap_pause(self):
        self.tap_video_control('playButton')
        Wait(self.marionette).until(lambda m: self.is_playing is False)

    def tap_mute(self):
        self.tap_video_control('muteButton')
        Wait(self.marionette).until(lambda m: self.is_muted is True)

    def tap_unmute(self):
        self.tap_video_control('muteButton')
        Wait(self.marionette).until(lambda m: self.is_muted is False)

    def tap_full_screen(self):
        self.tap_video_control('fullscreenButton')

    def is_video_playing(self):
        # test that newer timestamp has greater value than previous one
        tstart = self.current_timestamp
        time.sleep(2)
        return tstart < self.current_timestamp

    @property
    def current_timestamp(self):
        return float(self.root_element.get_attribute('currentTime'))
