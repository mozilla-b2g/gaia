import mozdevice
import os
import subprocess
import time
import pdb
from marionette.marionette import Actions
from marionette.marionette import MultiActions
from marionette.by import By

class ImageCompareUtil():
    def __init__(self, marionette, apps, gaiaTC, local_path):
        self.marionette = marionette
        self.apps = apps
        self.gaiaTC = gaiaTC
        self.temp_dir = 'temporary'
        self.ref_dir = 'refimages'
        self.shots_dir = 'shots'
        self.device_manager = mozdevice.DeviceManagerADB()


        if not os.path.exists(os.path.join(local_path, self.temp_dir)):
            os.makedirs(os.path.join(local_path, self.temp_dir))
        if not os.path.exists(os.path.join(local_path, self.ref_dir)):
            os.makedirs(os.path.join(local_path, self.ref_dir))
        if not os.path.exists(os.path.join(local_path, self.shots_dir)):
            os.makedirs(os.path.join(local_path, self.shots_dir))

    #find out the model name of the device
    @staticmethod
    def get_device_name():

        p = subprocess.Popen(['adb', 'shell', 'getprop', 'ro.product.model'], stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE)
        out, err = p.communicate()
        p.wait()
        return out.rstrip()

    #invokes screen capture event (pressing home button + sleep button together)
    def invoke_screen_capture(self,frame=None,browser=None):
        time.sleep(2)
        self.marionette.switch_to_frame()  # switch to root frame (system app)
        if (self.gaiaTC.testvars['post2dot0'] == 'true'):
            self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('volumedown+sleep'));")
        else:
            self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home+sleep'));")
        self.apps.switch_to_displayed_app()
        time.sleep(6)  # for the notification overlay to disappear
        if (frame != None) and (frame != 'root'):
            self.marionette.switch_to_frame(frame)
        if (browser != None):
            browser.switch_to_content()

        elif (frame == 'root'):
            self.marionette.switch_to_frame()

    #this can be used as an alternative to invoke_screen_capture, if you want to grab the whole buffer.  the dimension may
    #vary depending on the context
    def redraw_buffer(self, filename):
        shot = self.marionette.screenshot()
        fh = open(filename.join('png', 'wb'))
        fh.write(shot.decode('base64'))
        fh.close()

    #this method collects images in the sd card and places in the /refimages folder, renames it, and trims the top.
    def collect_ref_images(self, device_path, local_path, test_name):

        path = local_path + "/" + self.ref_dir + "/"
        temp_path = local_path + "/" + self.temp_dir + "/"
        self.wipe_folder_content(local_path, self.temp_dir)

        #save files to the folder
        self.device_manager._runPull(device_path, local_path + "/" + temp_path + "/")
        #go through the files and rename them accordingly based on order and resolution
        filelist = self.sorted_ls(self.temp_dir)
        print "Number of files pulled: " + str(len(filelist))
        filecounter = 0
        for f in filelist:
            print "Captured file: " + f
            if "png" in f:
                newname = temp_path + test_name + "_" + self.get_device_name() + "_" + str(filecounter) + ".png"

                os.rename(temp_path + f, newname)
                self.crop_images(newname, newname)
                filecounter += 1
        self.move(temp_path, path)

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
    def collect_screenshots(self, device_path, local_path, module_name):

        self.wipe_folder_content(local_path, self.temp_dir)
        self.device_manager._runPull(device_path, local_path + "/" + self.temp_dir + "/")
        os.chdir(os.path.join(os.getcwd(), self.temp_dir))

        filecounter = 0
        print "\n"
        for filename in self.sorted_ls(os.getcwd()):
            print "Copying..." + filename
            if "png" in filename:
                #rename files to following format: <counter>_<timestamp>_<testname>_<device>.png
                timestamp = filename[0:filename.find('.png')]
                newname = module_name + "_" + self.get_device_name().rstrip() + "_" + str(
                    filecounter) + "_" + timestamp + '.png'
                os.rename(filename, newname)
                self.crop_images(newname, newname)
                filecounter += 1
        os.chdir('..')

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

        if err != '0':
            print '\nWARNING: ' + err + ' pixels mismatched between ' + target_img + ' and ' + ref_img
            #raise self.ImageMismatchError(err, target_img,ref_img) #Enable this line instead if exception is needed

    #do batch image compare- pick images with specified module name and compare against ref images
    def batch_image_compare(self, local_path, module_name, fuzz_value):
        shot_path = local_path + "/" + self.shots_dir
        ref_path = local_path + "/" + self.ref_dir

        filelist = self.sorted_ls(shot_path)
        filecounter = 0
        for f in filelist:
            if module_name + "_" + self.get_device_name() + "_" + str(filecounter) in f:
                ref_file = ref_path + "/" + module_name + "_" + self.get_device_name() + "_" + str(filecounter) + ".png"
                self.sub_image_compare(os.path.join(shot_path, f),
                                       ref_file, os.path.join(shot_path, f) + "_diff.png", fuzz_value)
                filecounter += 1

    #do collect and compare in one shot
    def collect_and_compare(self, local_path, device_path, module_name, fuzz_value):
        self.collect_screenshots(device_path, local_path, module_name)
        self.batch_image_compare(local_path, module_name, fuzz_value)


    #execute the image job
    def execute_image_job(self):
        if (self.gaiaTC.testvars['collect_ref_images'] == 'true'):
            # collect screenshots and save it as ref images
            self.collect_ref_images(self.gaiaTC.testvars['screenshot_location'],'.',self.gaiaTC.module_name)
        else:
            # pull the screenshots off the device and compare.
            self.collect_and_compare('.',self.gaiaTC.testvars['screenshot_location'] , self.gaiaTC.module_name,
                                     self.gaiaTC.testvars['fuzz_factor'])

    #sort the files in the path in timestamp order and return as a list
    @staticmethod
    def sorted_ls(path):
        files = os.listdir(path)
        return sorted(files, key=lambda x: str(x.split('.')[0]))

    #wip the contents of specified folder
    def wipe_folder_content(self, path, folder_name):
        location = path + "/" + folder_name + "/"
        garbagelist = self.sorted_ls(location)
        for f in garbagelist:
            os.remove(location + "/" + f)

    #move files in the src folder to dst folder
    @staticmethod
    def move(src, dst):
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
    @staticmethod
    def edge_scroll(marionette,frame, direction, dist, release=True):

        start_x = 0
        dist_travelled = 0
        time_increment = 0.01

        if (dist > 1):
            dist = 1
        if direction == 'LtoR':
            start_x = 0
        elif direction == 'RtoL':
            start_x = frame.size['width']
            dist *= -1  #travel opposite direction

        limit = dist * frame.size['width']
        dist_unit = limit * time_increment

        action = Actions(marionette)
        action.press(frame,start_x,frame.size['height']/2) #press either the left or right edge

        while abs(dist_travelled) < abs(limit):
            action.move_by_offset(dist_unit, 0)
            action.wait(time_increment)
            dist_travelled += dist_unit
        if release == True:
            action.release()
        action.perform()
        return action

    #pinch method - works for gallery. Bug 1025167 is raised for the Browser pinch method.
    #Currently only works on Gallery
    #marionette = marionette object
    #zoom = 'in' or 'out'
    #level = level of zoom, 'low' or 'high'
    @staticmethod
    def pinch(marionette, locator, zoom, level):

        screen = marionette.find_element(*locator)
        index_finger = Actions(marionette)
        thumb = Actions(marionette)
        pinch = MultiActions(marionette)

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
            init_index_x = mid_x/2
            init_index_y = mid_y/2
            init_thumb_x = mid_x + mid_x/2
            init_thumb_y = mid_y + mid_y/2
            disp_x = -zoom_factor * mid_x/2
            disp_y = -zoom_factor * mid_y/2

        index_finger.press(screen,init_index_x,init_index_y).wait(0.15).move_by_offset(-disp_x, -disp_y).release()
        thumb.press(screen,init_thumb_x,init_thumb_y).wait(0.15).move_by_offset(disp_x, disp_y).wait().release()
        pinch.add(thumb).add(index_finger).perform()

    #scroll - works for gallery and Browser.  Consists of multiple micro-actions, like flick method.
    #marionette = marionette object
    #direction = 'up' or 'down' (page location)
    #rate = rate of scroll, from 0 to 1
    @staticmethod
    def scroll(marionette, locator, direction, rate, release=True):

        screen = marionette.find_element(*locator)
        dist_travelled = 0
        time_increment = 0.01 * rate

        vector = 0
        # define direction.  Assumption is that scroll is only one of below 4 direction
        if direction == 'up':
            vector = -1 * screen.size['height']/2
        elif direction == 'down':
            vector = 1 * screen.size['height']/2
        elif direction == 'right':
            vector = 1 * screen.size['width']/2
        elif direction == 'left':
            vector = -1 * screen.size['width']/2

        finger = Actions(marionette)
        finger.press(screen,screen.size['width'] / 2, screen.size['height'] / 2)
        while abs(dist_travelled) < abs(vector):
            if direction == 'up' or direction == 'down':
                finger.move_by_offset(0, vector * time_increment)
            elif direction == 'right' or direction == 'left':
                finger.move_by_offset(vector * time_increment,0)
            dist_travelled += abs(vector * time_increment)
            finger.wait(0.01)

        if release == True:
            finger.release()
        finger.perform()
        return finger

    class ImageMismatchError(Exception):
        def __init__(self, pixelcount, target, reference):
            message = '\n %s pixels mismatched between: %s, %s' \
                      % (pixelcount, target, reference)
            Exception.__init__(self, message)


