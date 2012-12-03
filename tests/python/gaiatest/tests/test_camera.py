# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestCamera(GaiaTestCase):

    _capture_button_locator = ('id', 'capture-button')
    _focus_ring = ('id','focus-ring')
    _switch_source_button_locator = ('id', 'switch-button')
    _film_strip_image_locator = (
        'css selector', 'div#film-strip div.image > img')
    _video_capturing_locator = ('css selector', 'body.capturing')
    _video_timer_locator = ('id', 'video-timer')

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.lockscreen.unlock()

        # launch the Camera app
        self.app = self.apps.launch('camera')

    def test_capture_a_photo(self):
        # https://moztrap.mozilla.org/manage/case/1325/

        self.wait_for_capture_ready()

        self.marionette.find_element(*self._capture_button_locator).click()

        # Wait to complete focusing
        self.wait_for_condition(lambda m: m.find_element(*self._focus_ring).get_attribute('data-state') != 'focusing')

        focus_state = self.marionette.find_element(*self._focus_ring).get_attribute('data-state')
        # The focus state will be either 'focused' or 'fail'
        self.assertEqual(focus_state, 'focused', "Camera failed to focus with error: %s" % focus_state)

        self.wait_for_element_present(*self._film_strip_image_locator)

        # Find the new picture in the film strip
        self.assertTrue(self.marionette.find_element(
            *self._film_strip_image_locator).is_displayed())

    def test_capture_a_video(self):
        # https://moztrap.mozilla.org/manage/case/2477/

        self.wait_for_capture_ready()
        self.marionette.find_element(
            *self._switch_source_button_locator).click()

        self.wait_for_capture_ready()
        self.marionette.find_element(*self._capture_button_locator).click()

        self.wait_for_element_present(*self._video_capturing_locator)

        # Wait for 3 seconds of recording
        self.wait_for_condition(lambda m: m.find_element(
            *self._video_timer_locator).text == '00:03')

        # Stop recording
        self.marionette.find_element(*self._capture_button_locator).click()

        self.wait_for_element_not_displayed(*self._video_timer_locator)

        # TODO
        # Validate the recorded video somehow

    def wait_for_capture_ready(self):
        self.marionette.set_script_timeout(10000)
        self.marionette.execute_async_script("""
            waitFor(
                function () { marionetteScriptFinished(); },
                function () { return document.getElementById('viewfinder').readyState > 1; }
            );
        """)

    def tearDown(self):

        # close the app
        if hasattr(self, 'app'):
            self.apps.kill(self.app)

        GaiaTestCase.tearDown(self)
