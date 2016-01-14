# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestAppsArePresent(GaiaTestCase):

    def test_apps_are_present(self):
        EXPECTED_APPS = (
            self._get_manifest_url_by_app_name('Phone') + '/dialer',
            self._get_manifest_url_by_app_name('Messages'),
            self._get_manifest_url_by_app_name('Contacts') + '/contacts',
            self._get_manifest_url_by_app_name('Email'),
            self._get_manifest_url_by_app_name('Camera'),
            self._get_manifest_url_by_app_name('Gallery'),
            self._get_manifest_url_by_app_name('Music'),
            self._get_manifest_url_by_app_name('VideoPlayer'),
            self._get_manifest_url_by_app_name('Marketplace'),
            self._get_manifest_url_by_app_name('Calendar'),
            self._get_manifest_url_by_app_name('Clock'),
            self._get_manifest_url_by_app_name('Settings'),
            self._get_manifest_url_by_app_name('FmRadio'),

            'https://marketplace.firefox.com/app/8d979279-a142-4fee-993b-8e7797b221a5/manifest.webapp', # BuddyUp
            self._get_manifest_url_by_app_name('BugzillaLite'),
            'https://m.facebook.com/openwebapp/manifest.webapp', # Facebook
            'https://mobile.twitter.com/cache/twitter.webapp', # Twitter
            'https://marketplace.firefox.com/app/dcdaeefc-26f4-4af6-ad22-82eb93beadcd/manifest.webapp', # Notes
            'https://marketplace.firefox.com/app/9f96ce77-5b2d-42ca-a0d9-10a933dd84c4/manifest.webapp', # Calculator
        )

        homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()
        for expected_app in EXPECTED_APPS:
            homescreen.wait_for_app_icon_present(expected_app)

    def _get_manifest_url_by_app_name(self, app):
        package_path = 'gaiatest.apps.{}.app'.format(app.lower())
        app_module = __import__(package_path, fromlist=[app])
        app_class = getattr(app_module, app)
        return app_class(self.marionette).manifest_url
