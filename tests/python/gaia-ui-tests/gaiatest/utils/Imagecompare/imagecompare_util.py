import mozdevice
import os
import subprocess
import time


class ImageCompareUtil():
    def __init__(self, marionette, local_path):
        self.marionette = marionette
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
    def invoke_screen_capture(self, frame):
        self.marionette.switch_to_frame()  # switch to root frame (system app)
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home+sleep'));")
        self.marionette.switch_to_frame(frame)  # switch back to original frame
        time.sleep(5)  # for the notification overlay to disappear

    #this can be used as an alternative to sub_image_compare, if you want to grab the whole buffer.  the dimension may
    #vary depending on the context
    def redraw_buffer(self, filename):
        shot = self.marionette.screenshot()
        fh = open(filename.join('png', 'wb'))
        fh.write(shot.decode('base64'))
        fh.close()

    #this method collects images in the sd card to the /refimages folder, trims the top, and renames it.
    #also creates /refimages folder if it does not exist
    #it should be noted that for each script would have its own ref images folder.
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
                newname = temp_path + str(filecounter) + "_" + test_name + "_" + self.get_device_name() + ".png"

                os.rename(temp_path + f, newname)
                self.crop_ref_images(newname, newname)
                filecounter += 1
        self.move(temp_path, path)

    # crops the top portion of the image by 1/24 of vertical resolution to remove the status bar
    @staticmethod
    def crop_ref_images(filename, newfilename):
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
        for filename in self.sorted_ls(os.getcwd()):
            print "shot filename: " + filename
            if "png" in filename:
                #rename files to following format: <counter>_<timestamp>_<testname>_<device>.png
                timestamp = filename[0:filename.find('.png')]
                newname = str(
                    filecounter) + "_" + timestamp + "_" + module_name + "_" + self.get_device_name().rstrip() + '.png'
                os.rename(filename, newname)
                self.crop_ref_images(newname, newname)
                filecounter += 1
        os.chdir('..')

        #dump to the target folder
        self.move(self.temp_dir, self.shots_dir)

    #do single image compare
    #reference and target images have stripped off status bar on top, because of the clock and other status changes
    #fuzz_value is the % of the fuzz factor for imagemagick.  (color difference) 5% seems to remove most rendering
    #peculiarities that report false positives
    @staticmethod
    def sub_image_compare(target_img, ref_img, diff_img, fuzz_value):
        p = subprocess.Popen(
            ["compare", "-fuzz", str(fuzz_value) + "%", "-metric", "AE", target_img, ref_img, diff_img],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        out, err = p.communicate()
        p.wait()
        print "\n" + target_img + " vs. " + ref_img + "\nNo. of mismatching pixels: " + err
        if err == '0':
            return "pass"
        else:
            return "fail"

    #do batch image compare- pick images with specified module name and compare against ref images
    def batch_image_compare(self, local_path, module_name, fuzz_value):
        shot_path = local_path + "/" + self.shots_dir
        ref_path = local_path + "/" + self.ref_dir

        filelist = self.sorted_ls(shot_path)
        filecounter = 0
        for f in filelist:
            if module_name in f:
                ref_file = ref_path + "/" + str(filecounter) + "_" + module_name + "_" + self.get_device_name() + ".png"
                print self.sub_image_compare(os.path.join(shot_path, f),
                                             ref_file, ref_file + "_diff.png", fuzz_value)
                filecounter += 1

    #sort the files in the path in timestamp order and return as a list
    @staticmethod
    def sorted_ls(path):
        #mtime = lambda f: os.stat(os.path.join(path, f)).st_mtime
        #return list(sorted(os.listdir(path), key=mtime))
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