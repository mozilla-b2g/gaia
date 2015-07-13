from gaiatest import GaiaTestCase
from gaiatest.apps.bzlite.app import BugzillaLite

class testBzLogout(GaiaTestCase):
    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

    def test_logout_BugzillaLite(self):
        bugzilla_lite = BugzillaLite(self.marionette)
        bugzilla_lite.launch()
        bugzilla_lite.logout()
        #self.assertTrue(bugzilla_lite.is_logged_out)
