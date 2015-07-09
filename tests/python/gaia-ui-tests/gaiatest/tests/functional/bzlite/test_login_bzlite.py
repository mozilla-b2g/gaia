from gaiatest import GaiaTestCase
from gaiatest.apps.bzlite.app import Bugzilla_Lite


class TestBugzillaLite(GaiaTestCase):

    def SetUp(self):
        GaiaTestCase.SetUp(self)
        self.connect_to_local_area_network()

    def test_login_BugzillaLite(self):
        BugzillaLite = Bugzilla_Lite(self.marionette)
        BugzillaLite.launch()
        BugzillaLite.login(self.testvars['bugzilla']['user'], self.testvars['bugzilla']['password'])
        slef.assertTrue(BugzillaLite.is_logged_in)

