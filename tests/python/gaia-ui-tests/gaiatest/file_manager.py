# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from abc import ABCMeta, abstractmethod
import os
import shutil

import mozlog


class GaiaFileManager(object):
    """Abstract file manager for Gaia."""
    __metaclass__ = ABCMeta

    def __init__(self, device, log_level=mozlog.ERROR):
        self._logger = mozlog.getLogger('GaiaFileManager')
        self._logger.setLevel(log_level)
        self.device = device

    @abstractmethod
    def copy_file(self, source, destination):
        """Copy a file."""

    @abstractmethod
    def dir_exists(self, path):
        """Return true if path exists and is a directory."""
        return

    def duplicate_file(self, path, count):
        """Create duplicates of a file on the system and remove original."""
        original = path
        path, sep, filename = path.rpartition('/')
        # We copy the file we've just created rather than pushing it
        # multiple times, which would be much slower.
        for i in range(1, count + 1):
            # Make the remote filename unique by including an index
            if '.' in filename:
                indexed_filename = '_%d.'.join(iter(
                    filename.rsplit('.', 1))) % i
            else:
                indexed_filename = '%s_%d' % (filename, i)
            duplicate = '/'.join([path, indexed_filename])
            self.copy_file(original, duplicate)
        self.remove(original)

    @abstractmethod
    def file_exists(self, path):
        """Return true if path exists and is a file."""
        return

    @abstractmethod
    def list_items(self, path):
        """List items in path."""
        return

    @abstractmethod
    def make_dirs(self, filename):
        """Make directory structure."""

    @abstractmethod
    def push_file(self, local_path, remote_path=None, count=1):
        """Push a file to the system."""

    @abstractmethod
    def remove(self, path):
        """Remove file or directory."""


class GaiaDeviceFileManager(GaiaFileManager):
    """File manager for Gaia instance running on a B2G device or emulator."""

    def copy_file(self, source, destination):
        self._logger.debug('Copying: %s to: %s' % (source, destination))
        self.device.manager.copyTree(source, destination)

    def dir_exists(self, path):
        self._logger.debug('Checking for existance of directory: %s' % path)
        return self.device.manager.dirExists(path)

    def file_exists(self, path):
        self._logger.debug('Checking for existance of file: %s' % path)
        return self.device.manager.fileExists(path)

    def list_items(self, path):
        self._logger.debug('Listing items in: %s' % path)
        return self.device.manager.listFiles(path)

    def make_dirs(self, filename):
        self.device.manager.mkDirs(filename)

    def push_file(self, local_path, remote_path=None, count=1):
        # If remote path is not specified, use the storage path
        remote_path = remote_path or self.device.storage_path
        filename = local_path.rpartition(os.path.sep)[-1]
        remote_file = '/'.join([remote_path, filename])
        self.make_dirs(remote_file)
        self.device.manager.pushFile(local_path, remote_file)
        if count > 1:
            self.duplicate_file(remote_file, count)

    def remove(self, path):
        self._logger.debug('Removing: %s' % path)
        self.device.manager.removeDir(path)


class GaiaLocalFileManager(GaiaFileManager):
    """File manager for Gaia instance running locally such as desktop B2G."""

    def copy_file(self, source, destination):
        source = os.path.normpath(source)
        destination = os.path.normpath(destination)
        self._logger.debug('Copying: %s to: %s' % (source, destination))
        shutil.copy(source, destination)

    def dir_exists(self, path):
        path = os.path.normpath(path)
        self._logger.debug('Checking for existance of directory: %s' % path)
        return os.path.isdir(path)

    def file_exists(self, path):
        path = os.path.normpath(path)
        self._logger.debug('Checking for existance of file: %s' % path)
        return os.path.isfile(path)

    def list_items(self, path):
        path = os.path.normpath(path)
        self._logger.debug('Listing items in: %s' % path)
        return os.listdir(path)

    def make_dirs(self, filename):
        filename = os.path.normpath(filename)
        containing = os.path.dirname(filename)
        if not os.path.isdir(containing):
            self._logger.debug('Making path: %s' % containing)
            os.makedirs(containing)

    def push_file(self, local_path, remote_path=None, count=1):
        # If remote path is not specified, use the storage path
        remote_path = remote_path or self.device.storage_path
        filename = local_path.rpartition(os.path.sep)[-1]
        remote_file = '/'.join([remote_path, filename])
        self.make_dirs(remote_file)

        path = os.path.normpath(remote_file)
        if os.path.isdir(path):
            raise Exception('Attempted to push a file (%s) to a directory '
                            '(%s)!' % (local_path, path))
        if not os.access(local_path, os.F_OK):
            raise Exception('File not found: %s' % local_path)
        self._logger.debug('Pushing: %s to: %s' % (local_path, path))
        self.copy_file(local_path, path)
        if count > 1:
            self.duplicate_file(remote_file, count)

    def remove(self, path):
        path = os.path.normpath(path)
        if os.path.isfile(path):
            self._logger.debug('Removing file: %s' % path)
            os.remove(path)
        elif os.path.isdir(path):
            self._logger.debug('Removing directory: %s' % path)
            shutil.rmtree(path)
