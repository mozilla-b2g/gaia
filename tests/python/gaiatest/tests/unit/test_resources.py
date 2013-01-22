# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestResources(GaiaTestCase):

    def test_push_resource(self):
        resource = 'IMG_0001.jpg'
        self.data_layer.push_resource(resource)
        self.assertTrue(resource in self.data_layer.media_files)
