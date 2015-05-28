# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


import datetime
import os
import subprocess
import time
from StringIO import StringIO

from PIL import Image
from marionette_driver import By
from marionette_driver.marionette import Actions
from marionette_driver.gestures import pinch, smooth_scroll
from mozlog.structured import get_default_logger

from gaiatest import GaiaTestCase
from gaiatest.apps.system.app import System


class GaiaImageCompareTestCase(GaiaTestCase):
    def __init__(self, *args, **kwargs):
        GaiaTestCase.__init__(self, *args, **kwargs)

        self.store_reference_image = kwargs.pop('store_reference_image', False)
        self.fuzz_factor = kwargs.pop('fuzz_factor')
        self.reference_path = kwargs.pop('reference_path')
        self.screenshots_path = kwargs.pop('screenshots_path')

        self.logger = get_default_logger()
        self.picture_index = 0
        self.test_passed = True

        self.failcomment = ""

        # set up directories
        if not os.path.exists(self.reference_path):
            os.makedirs(self.reference_path)
        if not os.path.exists(self.screenshots_path):
            os.makedirs(self.screenshots_path)

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.device_name = self.marionette.session_capabilities.get('device', 'unknown')

    def tearDown(self):
        """At the end of test execution, it checks for the errors"""
        self.assertTrue(self.test_passed, msg=self.failcomment)

    def take_screenshot(self):
        """invokes screen capture event, crops the status bar, and saves to the file"""

        time.sleep(2)  # compensate for the time taken for actual action on previous step

        # if the status bar is visible, crop it off
        current_frame = self.marionette.get_active_frame()
        self.marionette.switch_to_frame()

        _statusbar_locator = (By.ID, 'statusbar')
        #if self.is_element_displayed(*System._status_bar_locator):
        if self.is_element_displayed(*_statusbar_locator):
        # get the size of the status bar to crop off
            status_bar = self.marionette.find_element(*System._status_bar_locator)
            # get the size of the status bar, and multiply it by the device pixel ratio to get the exact size on device
            self.crop_height = int(status_bar.size['height']
                                   * self.marionette.execute_script('return window.wrappedJSObject.devicePixelRatio;'))
        else:
            self.crop_height = 0
        self.marionette.switch_to_frame(current_frame)

        # take screenshot
        self.marionette.set_context(self.marionette.CONTEXT_CHROME)
        screenshot = self.marionette.screenshot(format="binary")
        self.marionette.set_context(self.marionette.CONTEXT_CONTENT)

        # obtain reference filename
        reference_filename = os.path.join(self.reference_path, '%s_%s_%s.png' % (
            self.methodName, self.device_name, self.picture_index))

        # determine the image file name (path included)
        if self.store_reference_image:
            filename = reference_filename
        else:
            timestamp = datetime.datetime.now().strftime('%Y-%m-%d-%H-%M-%S')
            filename = os.path.join(self.screenshots_path, '%s_%s_%s+%s.png' % (
                self.methodName, self.device_name, self.picture_index, timestamp))

        # save the image after cropping it
        im = Image.open(StringIO(screenshot))
        crop_box = (0, self.crop_height) + im.size
        new_image = im.crop(crop_box)
        new_image.save(filename)

        # when not collecting reference image, compare the image to the reference
        if self.store_reference_image is False:

            # get the contents for the reference folder for a match
            ref_file_list = os.listdir(self.reference_path)
            for i, p in enumerate(ref_file_list):
                ref_file_list[i] = os.path.join(self.reference_path, p)

            if reference_filename in ref_file_list:

                error_msg = self.image_compare(filename,
                                               reference_filename,
                                               "{0}_diff.png".format(filename[0:filename.find(".png")]),
                                               self.fuzz_factor)
            else:
                error_msg = "Ref file not found for: " + filename + '\n'
            if error_msg != "":
                self.logger.critical(error_msg)
                self.failcomment += error_msg
                self.test_passed = False

        self.picture_index += 1

    def image_compare(self, target_img, ref_img, diff_img, fuzz_value):
        """do single image compare using the convert console command of ImageMagick"""

        message = ""

        p = subprocess.Popen(
            ["compare", "-fuzz", str(fuzz_value) + "%", "-metric", "AE", target_img, ref_img, diff_img],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        out, err = p.communicate()
        p.wait()

        if not (err == '0\n' or err == '0'):
            err = err.replace('\n', '')
            message = 'WARNING: ' + err + ' pixels mismatched between ' + target_img + ' and ' + ref_img + '\n'

        return message

    def edge_scroll(self, frame, direction, dist, release=True):
        """edge scroll - performs task switching action.

        direction = 'LtoR' or 'RtoL' (finger movement direction)
        dist = percentage of horizontal distance travel, max is 1.0
        release = if set to False, the Action object will be returned so the user can complete the release action"""

        start_x = 0
        dist_travelled = 0
        time_increment = 0.01

        if dist > 1:
            dist = 1
        if direction == 'LtoR':
            start_x = 0
        elif direction == 'RtoL':
            start_x = frame.size['width']
            dist *= -1  # travel opposite direction

        limit = dist * frame.size['width']
        dist_unit = limit * time_increment

        action = Actions(self.marionette)
        action.press(frame, start_x, frame.size['height'] / 2)  # press either the left or right edge

        while abs(dist_travelled) < abs(limit):
            action.move_by_offset(dist_unit, 0)
            action.wait(time_increment)
            dist_travelled += dist_unit
        if release:
            action.release()
        action.perform()

        return action

    def pinch(self, locator, zoom, duration=200):
        """pinch method - works for gallery. Bug 1025167 is raised for the Browser pinch method.

        zoom = 'in' or 'out'
        level = level of zoom, 'low' or 'high'"""

        screen = self.marionette.find_element(*locator)
        mid_x = screen.size['width'] / 2
        mid_y = screen.size['height'] / 2

        # default is zooming in
        init_index_x = mid_x
        init_index_y = mid_y
        init_thumb_x = mid_x
        init_thumb_y = mid_y
        disp_x = mid_x
        disp_y = mid_y

        if zoom == 'out':
            init_index_x = mid_x / 2
            init_index_y = mid_y / 2
            init_thumb_x = mid_x + mid_x / 2
            init_thumb_y = mid_y + mid_y / 2
            disp_x = - mid_x / 2
            disp_y = - mid_y / 2

        pinch(self.marionette, screen, init_index_x, init_index_y, init_thumb_x, init_thumb_y,
              -disp_x, -disp_y, disp_x, disp_y, duration)

    def scroll(self, locator, direction, distance, increments=None):
        """scroll - uses smooth_scroll method in gestures.py.

        direction = 'up' or 'down' (page location)
        distance = total distance to travel
        increments = rate of scroll
        perform release afterwards """

        screen = self.marionette.find_element(*locator)
        vector = -1
        axis = 'x'
        if direction == 'up' or direction == 'down':
            axis = 'y'
        #
        # define direction.
        if direction == 'up' or direction == 'left':
            vector = 0

        smooth_scroll(self.marionette, screen, axis, vector, distance, increments)
