# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: 107 minutes

import time

from gaiatest import GaiaEnduranceTestCase


class TestEnduranceBackgroundApps(GaiaEnduranceTestCase):

    # Device has limited memory so only test with these apps for now
    app_list = (["phone", "messages", "contacts", "browser", "clock"])

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

        # Launch several apps and minimize them in the background
        self.launch_app_and_minimize()

    def launch_app_and_minimize(self):
        print "\n"
        app_objs = []
        for next_app in self.app_list:
            # Launch the app
            print "Launching %s app..." %next_app
            app_objs.append(self.apps.launch(next_app))
            time.sleep(5)
            # Minimize app into the background
            self.marionette.switch_to_frame()
            self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home'));")
            time.sleep(5)

    def test_endurance_background_apps(self):
        self.drive(test=self.background_apps, app='homescreen')

    def background_apps(self):
        # Verify each app is running
        self.marionette.switch_to_frame()
        running_apps = [a.name.lower() for a in self.apps.running_apps]

        for expected_app in self.app_list:
            self.assertTrue(expected_app in running_apps, '%s app should be running!' % expected_app)

        # Also ensure homescreen still running
        self.assertTrue("homescreen" in running_apps, "homescreen app should be running!")

        # Just leave apps running in background
        time.sleep(60)
