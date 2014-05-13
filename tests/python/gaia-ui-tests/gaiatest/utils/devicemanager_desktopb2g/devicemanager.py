# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import shutil

class DeviceManagerDesktopB2G:
    '''
    A wrapper of Python os/shutil using mozdevice syntax, for desktopb2g file operations
    It is designed to match http://mozbase.readthedocs.org/en/latest/mozdevice.html
    '''

    def _checkCmd(self, args):
        # strip the preceding shell command, redundant with os.system
        cmd = ' '.join(args).strip('shell')
        os.system(cmd)

    def dirExists(self, remotePath):
        return os.path.exists(remotePath)

    def fileExists(self, filepath):
        return os.path.isfile(filepath)

    def mkDirs(self, filename):
        '''
        Make directory structure on the device.

        WARNING: does not create last part of the path. For example, if asked to
        create /mnt/sdcard/foo/bar/baz, it will only create /mnt/sdcard/foo/bar
        '''

        # Split the filename string to get just the path and remove the filename
        parts = filename.rpartition(os.path.sep)

        if not self.dirExists(parts[0]):
            os.makedirs(parts[0])

    def pushFile(self, localname, destname):
        if self.dirExists(destname):
            raise Exception('Attempted to push a file (%s) to a directory (%s)' %
                            (localname, destname))
        if not os.access(localname, os.F_OK):
            raise Exception('File not found: %s' % localname)
        shutil.copy(localname, destname)

    def listFiles(self, rootdir):
        file_list = []

        for folder, subs, files in os.walk(rootdir):
            for filename in files:
                # Remove the rootdir to return path relative to the storage/sdcard
                file_list += [os.path.join(folder.strip(rootdir), filename)]
        return file_list

    def removeDir(self, remoteDir):
        if self.dirExists(remoteDir):
            os.remove(remoteDir)
        else:
            self.removeFile(remoteDir.strip())

    def removeFile(self, filename):
        if self.fileExists(filename):
            os.remove(filename)
