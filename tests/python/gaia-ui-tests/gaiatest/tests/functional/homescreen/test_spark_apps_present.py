# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestSparkAppsArePresent(GaiaTestCase):

    def test_spark_apps_are_present(self):
        homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()
        for expected_app in ({'name': 'Customizer', 'manifest': 'app://customizer-launcher.gaiamobile.org/manifest.webapp'},
                             {'name': 'Hackerplace', 'manifest': 'app://directory.gaiamobile.org/manifest.webapp'},
                             {'name': 'Studio', 'manifest': 'app://studio.gaiamobile.org/manifest.webapp'},
                             {'name': 'Sharing', 'manifest': 'app://sharing.gaiamobile.org/manifest.webapp'},
                             {'name': 'Webmaker', 'manifest': 'http://webmaker.fxosapps.org/manifest.webapp'},
                             {'name': 'Bugzilla Lite', 'manifest': 'https://www.bzlite.com/manifest.webapp'},
                             {'name': 'Facebook', 'manifest': 'https://m.facebook.com/openwebapp/manifest.webapp'},
                             {'name': 'Twitter', 'manifest': 'https://mobile.twitter.com/cache/twitter.webapp'},
                             {'name': 'RunWhatsApp (Preview)', 'manifest': 'https://marketplace.firefox.com/app/f2ed31a0-05ed-416b-ac0d-0f26db063839/manifest.webapp'},
                             {'name': 'BuddyUp', 'manifest': 'https://marketplace.firefox.com/app/8d979279-a142-4fee-993b-8e7797b221a5/manifest.webapp'},
                             {'name': 'Notes', 'manifest': 'https://marketplace.firefox.com/app/dcdaeefc-26f4-4af6-ad22-82eb93beadcd/manifest.webapp'},
                             {'name': 'Calculator', 'manifest': 'https://marketplace.firefox.com/app/9f96ce77-5b2d-42ca-a0d9-10a933dd84c4/manifest.webapp'},
                             {'name': 'SWOOOP', 'manifest': 'https://marketplace.firefox.com/app/be9138a3-9672-4796-9c27-0f27aaced70a/manifest.webapp'},
                             {'name': 'Firesea IRC', 'manifest': 'http://operatorvariant.fxosapps.org/manifest.webapp'},
                             {'name': 'MozSpeech', 'manifest': 'app://customizer.gaiamobile.org/manifest.webapp'},
                             {'name': 'Foxfooding', 'manifest': 'https://foxfooding.github.io/manifest.webapp'}):
            homescreen.wait_for_app_icon_present(expected_app['manifest'])
