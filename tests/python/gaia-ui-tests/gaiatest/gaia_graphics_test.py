# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with thisgit
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
import inspect
import tempfile

from gaiatest import GaiaTestCase
from mixins.imagecompare import ImageCompareTestCaseMixin
import mozversion
import os
import subprocess
import time
from marionette.marionette import Actions
from marionette.marionette import MultiActions
import pdb


class GaiaGraphicsTestCase(GaiaTestCase, ImageCompareTestCaseMixin):
    def __init__(self, *args, **kwargs):
        GaiaTestCase.__init__(self, *args, **kwargs)
        ImageCompareTestCaseMixin.__init__(self, *args, **kwargs)

        self.temp_dir = tempfile.mkdtemp()
        self.local_path = '.'

        if not os.path.exists(os.path.join(self.local_path, self.ref_dir)):
            os.makedirs(os.path.join(self.local_path, self.ref_dir))
        if not os.path.exists(os.path.join(self.local_path, self.shots_dir)):
            os.makedirs(os.path.join(self.local_path, self.shots_dir))

    def setUp(self):
        GaiaTestCase.setUp(self)
        # # Setup image comparison specific methods
        self.device_name = self.get_device_name()
        if self.device_name == "flame":
            self.screenshot_location = "//storage//sdcard0//screenshots//"

        # use reflection method to find its own test name
        frm = inspect.stack()[1]
        mod = inspect.getmodule(frm[0])
        self.module_name = mod.__name__

    def tearDown(self):
        # # Cleanup image comparison specific methods
        self.execute_image_job()
        GaiaTestCase.tearDown(self)

    def get_device_name(self):
        version = mozversion.get_version(dm_type='adb')
        return version.pop('device_id')

    # invokes screen capture event (pressing home button + sleep button together)
    def invoke_screen_capture(self, frame=None, browser=None):
        time.sleep(2)
        self.marionette.switch_to_frame()  # switch to root frame (system app)
        if self.post2dot0 is True:
            self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('volumedown+sleep'));")
        else:
            self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home+sleep'));")
        self.apps.switch_to_displayed_app()
        time.sleep(6)  # for the notification overlay to disappear
        if (frame is not None) and (frame is not 'root'):
            self.marionette.switch_to_frame(frame)
        if browser is not None:
            browser.switch_to_content()

        elif frame is 'root':
            self.marionette.switch_to_frame()

    # this method collects images in the sd card and places in the /refimages folder, renames it, and trims the top.
    def ref_image_collection(self, device_path, local_path, test_name):

        ref_dir = local_path + "/" + self.ref_dir + "/"

        self.wipe_folder_content(self.temp_dir)

        #save files to the folder
        self.device_manager._runPull(device_path, self.temp_dir)
        #go through the files and rename them accordingly based on order and resolution
        filelist = self.sorted_ls(self.temp_dir)
        print "Number of files pulled: " + str(len(filelist))
        filecounter = 0
        for f in filelist:
            print "Captured file: " + f
            if "png" in f:
                newname = os.path.join(self.temp_dir,
                                       test_name + "_" + self.device_name + "_" + str(filecounter) + ".png")

                os.rename(os.path.join(self.temp_dir, f), newname)
                self.crop_images(newname, newname)
                filecounter += 1
        self.move(self.temp_dir, ref_dir)

    # crops the top portion of the image by 1/24 of vertical resolution to remove the status bar
    @staticmethod
    def crop_images(filename, newfilename):
        #get vertical dimension of the image
        p = subprocess.Popen(["identify", filename],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        out, err = p.communicate()
        p.wait()
        index = out.replace(' ', 'X', 2).find(' ')
        dimension = out[index + 1:out.find("+0+0")]
        h_dimension = dimension[0:dimension.find('x')]
        v_dimension = dimension[dimension.find('x') + 1:]

        if v_dimension < h_dimension:  # it is in landscape mode.  But, the status bar has same width!
            cropfactor = int(h_dimension) / 24
        else:
            cropfactor = int(v_dimension) / 24  # magic number

        new_v_dimension = int(v_dimension) - cropfactor

        subprocess.call(
            ["convert", filename, "-crop", h_dimension + "x" + str(new_v_dimension) + "+0+" + str(cropfactor),
             newfilename],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        #verify the file exists
        os.path.isfile(newfilename)

    #pulls the screenshots off the device and copies locally.  Make sure the path ends with '/', so multi-file copy
    #can be enabled.  It appends device info and test name
    def collect_screenshots(self, device_path, module_name):

        self.wipe_folder_content(self.temp_dir)
        self.device_manager._runPull(device_path, self.temp_dir)

        filecounter = 0
        print "\n"
        for filename in self.sorted_ls(self.temp_dir):
            print "Copying..." + filename
            if "png" in filename:
                #rename files to following format: <testname>_<device>_<counter>+<timestamp>.png
                timestamp = filename[0:filename.find(".png")]
                newname = os.path.join(self.temp_dir, module_name + "_" + self.device_name + "_" + str(
                    filecounter) + "+" + timestamp + ".png")
                os.rename(os.path.join(self.temp_dir, filename), newname)
                self.crop_images(newname, newname)
                filecounter += 1

        #dump to the target folder
        self.move(self.temp_dir, self.shots_dir)

    #do single image compare
    #reference and target images have stripped off status bar on top, because of the clock and other status changes
    #fuzz_value is the % of the fuzz factor for imagemagick.  (color difference) 5% seems to remove most rendering
    #peculiarities that report false positives
    def sub_image_compare(self, target_img, ref_img, diff_img, fuzz_value):
        p = subprocess.Popen(
            ["compare", "-fuzz", str(fuzz_value) + "%", "-metric", "AE", target_img, ref_img, diff_img],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        out, err = p.communicate()
        p.wait()

        if not (err == '0\n' or err == '0'):
            print '\nWARNING: ' + err + ' pixels mismatched between ' + target_img + ' and ' + ref_img
            #raise self.ImageMismatchError(err, target_img,ref_img) #Enable this line instead if exception is needed

    #do batch image compare- pick images with specified module name and compare against ref images
    def batch_image_compare(self, local_path, module_name, fuzz_value):
        shot_path = local_path + "/" + self.shots_dir
        ref_path = local_path + "/" + self.ref_dir

        file_list = self.sorted_ls(shot_path)
        ref_file_list = self.sorted_ls(ref_path)
        for f in file_list:
            if module_name + "_" + self.device_name in f:
                ref_name = f[0:f.find("+")] + ".png"
                if ref_name in ref_file_list:
                    self.sub_image_compare(os.path.join(shot_path, f),
                                           os.path.join(ref_path, ref_name),
                                           os.path.join(shot_path, f[0:f.find(".png")]) + "_diff.png", fuzz_value)
                else:
                    print ("Ref file not found for: " + f)

    # do collect and compare in one shot
    def collect_and_compare(self, local_path, device_path, module_name, fuzz_value):
        self.collect_screenshots(device_path, module_name)
        self.batch_image_compare(local_path, module_name, fuzz_value)

    # execute the image job
    def execute_image_job(self):
        if self.collect_ref_images is True:
            # collect screenshots and save it as ref images
            self.ref_image_collection(self.screenshot_location, '.', self.module_name)
        else:
            # pull the screenshots off the device and compare.
            self.collect_and_compare('.', self.screenshot_location, self.module_name,
                                     self.fuzz_factor)

    #sort the files in the path in timestamp order and return as a list
    def sorted_ls(self, path):
        files = os.listdir(path)
        return sorted(files, key=lambda x: str(x.split('.')[0]))

    #wipe the contents of specified folder
    def wipe_folder_content(self, path):
        garbagelist = self.sorted_ls(path)
        for f in garbagelist:
            os.remove(os.path.join(path, f))

    #move files in the src folder to dst folder
    def move(self, src, dst):
        listoffiles = os.listdir(src)
        for f in listoffiles:
            fullpath = src + "/" + f
            os.system("mv" + " " + fullpath + " " + dst)

    #UI action methods

    #scroll - works for gallery and Browser.  Consists of multiple micro-actions, like flick method.
    #marionette = marionette object
    #direction = 'LtoR' or 'RtoL' (finger movement direction)
    #dist = percentage of horizontal distance travel, max is 1.0
    #release = if set to False, the Action object will be returned so the user can complete the release action
    def edge_scroll(self, frame, direction, dist, release=True):

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
        if release is True:
            action.release()
        action.perform()
        return action

    #pinch method - works for gallery. Bug 1025167 is raised for the Browser pinch method.
    #Currently only works on Gallery
    #marionette = marionette object
    #zoom = 'in' or 'out'
    #level = level of zoom, 'low' or 'high'
    def pinch(self, locator, zoom, level):

        global init_thumb_x
        screen = self.marionette.find_element(*locator)
        index_finger = Actions(self.marionette)
        thumb = Actions(self.marionette)
        pinch = MultiActions(self.marionette)

        mid_x = screen.size['width'] / 2
        mid_y = screen.size['height'] / 2

        zoom_factor = 0
        if level == 'low':
            zoom_factor = 0.5
        elif level == 'high':
            zoom_factor = 1

        if zoom == 'in':
            init_index_x = mid_x
            init_index_y = mid_y
            init_thumb_x = mid_x
            init_thumb_y = mid_y
            disp_x = zoom_factor * mid_x
            disp_y = zoom_factor * mid_y
        elif zoom == 'out':
            init_index_x = mid_x / 2
            init_index_y = mid_y / 2
            init_thumb_x = mid_x + mid_x / 2
            init_thumb_y = mid_y + mid_y / 2
            disp_x = -zoom_factor * mid_x / 2
            disp_y = -zoom_factor * mid_y / 2

        if zoom == 'in' or zoom == 'out':
            index_finger.press(screen, init_index_x, init_index_y).wait(0.15).move_by_offset(-disp_x, -disp_y).release()
            thumb.press(screen, init_thumb_x, init_thumb_y).wait(0.15).move_by_offset(disp_x, disp_y).wait().release()
            pinch.add(thumb).add(index_finger).perform()

    #scroll - works for gallery and Browser.  Consists of multiple micro-actions, like flick method.
    #marionette = marionette object
    #direction = 'up' or 'down' (page location)
    #rate = rate of scroll, from 0 to 1
    def scroll(self, locator, direction, rate, release=True, distance=-1):

        screen = self.marionette.find_element(*locator)
        dist_travelled = 0
        time_increment = 0.01 * rate
        vector = 0

        if distance != -1:
            vector = distance
        elif direction == 'up' or direction == 'down':
            vector = screen.size['height'] / 2
        elif direction == 'right' or direction == 'left':
            vector = screen.size['width'] / 2

        # define direction.  Assumption is that scroll is only one of below 4 direction
        if direction == 'up' or direction == 'left':
            vector *= -1

        finger = Actions(self.marionette)
        finger.press(screen, screen.size['width'] / 2, screen.size['height'] / 2)
        while abs(dist_travelled) < abs(vector):
            if direction == 'up' or direction == 'down':
                finger.move_by_offset(0, vector * time_increment)
            elif direction == 'right' or direction == 'left':
                finger.move_by_offset(vector * time_increment, 0)
            dist_travelled += abs(vector * time_increment)
            finger.wait(0.01)

        if release is True:
            finger.release()
        finger.perform()
        return finger

    class ImageMismatchError(Exception):
        def __init__(self, pixelcount, target, reference):
            message = '\n %s pixels mismatched between: %s, %s' \
                      % (pixelcount, target, reference)
            Exception.__init__(self, message)
