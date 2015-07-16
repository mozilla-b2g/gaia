from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.regions.confirm_install import ConfirmInstall
import time
from gaiatest.apps.bzlite.app import BugzillaLiteStage


class TestFillBug(GaiaTestCase):
    def setUp(self):
        GaiaTestCase.setUp(self)
        self.push_resource('IMG_0001.jpg') # <= No detail about how to send a file
        self.connect_to_local_area_network() # <= No detail about how to connect
        name = 'Bugzilla Lite Stage'
        url = 'http://bzlite-staging.herokuapp.com/manifest.webapp'
        self.apps.install_app(name, url) # <= No detail about how to install


    def test_fill_new_bug(self):

        bug_title = "Automation Test %s" % str(time.time())
        bug_description = "Description of an Automation test %s" % str(time.time())

        bugzilla_lite = BugzillaLiteStage(self.marionette)
        bugzilla_lite.launch()

        bugzilla_lite.dismiss_tooltip()
        bugzilla_lite.dismiss_content()

        bugzilla_lite.login(self.testvars['bugzillaStage']['user'], self.testvars['bugzillaStage']['password'])

        bugzilla_lite.create_new_bug(bug_title, bug_description)

        bugzilla_lite.navigate_filed_bug()

        #self.assertTrue(is_loaded)
        #self.marionette.find_element(*self._back_locator).tap()
        #self.wait_for_dashboard_navigator_to_be_displayed()
