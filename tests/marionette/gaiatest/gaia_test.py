# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import MarionetteTestCase
import os


class LockScreen(object):

    def __init__(self, marionette):
        self.marionette = marionette

    def unlock(self):
        success = self.marionette.execute_async_script("""
waitFor(
    function() {
        window.wrappedJSObject.LockScreen.unlock();
        waitFor(
            function() {
                finish(window.wrappedJSObject.LockScreen.locked);
            },
            function() {
                return !window.wrappedJSObject.LockScreen.locked;
            }
        );
    },
    function() {
        return !!window.wrappedJSObject.LockScreen;
    }
);
""")
        return success


class GaiaApps(object):

    def __init__(self, marionette):
        self.marionette = marionette
        js = os.path.abspath(os.path.join(__file__, os.path.pardir, "gaia_apps.js"))
        self.marionette.import_script(js)

    def launch(self, name):
        success = self.marionette.execute_async_script("launchAppWithName('%s')" % name)
        return success


class GaiaTestCase(MarionetteTestCase):

    def setUp(self):
        MarionetteTestCase.setUp(self)
        self.marionette.set_script_timeout(20000)
        self.lockscreen = LockScreen(self.marionette)
        self.apps = GaiaApps(self.marionette)

    def tearDown(self):
        self.lockscreen = None
        self.apps = None
        MarionetteTestCase.tearDown(self)
