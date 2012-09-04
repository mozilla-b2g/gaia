# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import time
from marionette_test import MarionetteTestCase

class TestLaunch(MarionetteTestCase):
    def test_launch(self):
        apps = ['cuttherope','music','dialer','gallery','video','clock','browser','sms','camera',
                'calculator','cubevid','crystalskull','towerjelly','penguinpop','settings']

        #kill all apps we're testing, then launch
        for app in apps:
            self.marionette.execute_script("window.wrappedJSObject.WindowManager.kill('http://%s.gaiamobile.org');" % app)
        for app in apps:
            self.marionette.set_script_timeout(10000)
            t = self.marionette.execute_async_script("let marionetteAppStart = Date.now();"
                                                  + "window.addEventListener('mozChromeEvent', function(e) {"
                                                  + "if (e.detail.type === 'webapps-launch') {"
                                                  +  " let marionetteAppLoad = Date.now() - marionetteAppStart;"
                                                  +  " window.removeEventListener('mozChromeEvent', arguments.callee);"
                                                  +  " marionetteScriptFinished(marionetteAppLoad);"
                                                  +  "}"
                                                  +  "});"
                                                  +  "window.wrappedJSObject.WindowManager.launch('http://%s.gaiamobile.org');" % app)
            self.marionette.add_perf_data("startup", app, t)
            time.sleep(1)
            self.marionette.execute_script("window.wrappedJSObject.WindowManager.kill('http://%s.gaiamobile.org');" % app)
