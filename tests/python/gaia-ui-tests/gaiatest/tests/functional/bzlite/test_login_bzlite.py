from gaiatest import GaiaTestCase
from gaiatest.apps.bzlite.app import BugzillaLite


class TestBugzillaLite(GaiaTestCase):
    def test_login_BugzillaLite(self):
        self.BugzillaLite = BugzillaLite(self.marionette)
        slef.BugzillaLite.launch()
        # enter the username and the password
        self.BugzillaLite.login(self.testvars['bugzilla']['user'], self.testvars['bugzilla']['password'])
        # check the log in 
        #self.assertTrue(self.BugzillaLite.is_logged_in)

