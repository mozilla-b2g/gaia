# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestFileManager(GaiaTestCase):

    def test_copy_file(self):
        filename = 'IMG_0001.jpg'
        self.device.file_manager.push_file(self.resource(filename))
        path = '/'.join([self.device.storage_path, filename])
        copy_path = '%s_copy' % path
        self.device.file_manager.copy_file(path, copy_path)
        self.assertTrue(self.device.file_manager.file_exists(copy_path))

    def test_duplicate_file(self):
        original = 'IMG_0001.jpg'
        duplicates = ['IMG_0001_1.jpg', 'IMG_0001_2.jpg']
        self.device.file_manager.push_file(self.resource(original))
        path = '/'.join([self.device.storage_path, original])
        self.device.file_manager.duplicate_file(path, len(duplicates))
        self.assertFalse(self.device.file_manager.file_exists(path))
        for filename in duplicates:
            self.assertTrue(self.device.file_manager.file_exists(
                '/'.join([self.device.storage_path, filename])))

    def test_list_items(self):
        path = '/'.join([self.device.storage_path, 'foo'])
        self.device.file_manager.make_dirs('/'.join([path, 'bar']))
        self.assertIn('foo', self.device.file_manager.list_items(
            self.device.storage_path))

    def test_make_dirs(self):
        path = '/'.join([self.device.storage_path, 'foo'])
        self.assertFalse(self.device.file_manager.dir_exists(path))
        self.device.file_manager.make_dirs('/'.join([path, 'bar']))
        self.assertTrue(self.device.file_manager.dir_exists(path))

    def test_push_file(self):
        filename = 'IMG_0001.jpg'
        self.device.file_manager.push_file(self.resource(filename))
        self.assertTrue(self.device.file_manager.file_exists(
            '/'.join([self.device.storage_path, filename])))

    def test_remove_dir(self):
        path = '/'.join([self.device.storage_path, 'foo'])
        self.device.file_manager.make_dirs('/'.join([path, 'bar']))
        self.device.file_manager.remove(path)
        self.assertFalse(self.device.file_manager.dir_exists(path))

    def test_remove_file(self):
        filename = 'IMG_0001.jpg'
        self.device.file_manager.push_file(self.resource(filename))
        path = '/'.join([self.device.storage_path, filename])
        self.device.file_manager.remove(path)
        self.assertFalse(self.device.file_manager.file_exists(path))
