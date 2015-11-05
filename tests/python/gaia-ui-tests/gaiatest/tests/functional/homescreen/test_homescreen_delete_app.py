# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.homescreen.regions.confirm_install import ConfirmInstall
from marionette.marionette_test import parameterized


class TestDeleteApp(GaiaTestCase):

    regular_app = {
        'name': 'Mozilla QA WebRT Tester',
        'partial_url': 'webapps/mozqa.com/manifest.webapp'
    }
    packaged_app = {
        'name': 'packagedapp1',
        'partial_url': 'webapps/packaged1/manifest.webapp',
        'title': 'Packaged app1'
    }

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

        self.homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

    def parameterized_set_up(self, app_to_delete, install_method):
        self.app_to_delete = app_to_delete
        self.app_to_delete['url'] = self.marionette.absolute_url(self.app_to_delete['partial_url'])

        self.marionette.execute_script('navigator.mozApps.{}("{}")'.format(install_method, self.app_to_delete['url']))

        # Confirm the installation and wait for the app icon to be present
        confirm_install = ConfirmInstall(self.marionette)
        confirm_install.tap_confirm()

        self.apps.switch_to_displayed_app()
        self.homescreen.wait_for_app_icon_present(self.app_to_delete['url'])

    @parameterized('regular_app', regular_app, 'install')
    @parameterized('packaged_app', packaged_app, 'installPackage')
    def test_delete(self, app_to_delete, install_method):
        # We can't pass parameters to the setUp(). Bug # to be filed
        self.parameterized_set_up(app_to_delete, install_method)

        self.homescreen.delete_app(self.app_to_delete['url']).tap_confirm()
        self.homescreen.wait_to_be_displayed()
        self.apps.switch_to_displayed_app()
        self.homescreen.wait_for_app_icon_not_present(self.app_to_delete['url'])

        # Check that the app is no longer available
        with self.assertRaises(AssertionError):
            self.apps.launch(self.app_to_delete['url'])

    def tearDown(self):
        self.apps.uninstall(self.app_to_delete['url'])
        GaiaTestCase.tearDown(self)
