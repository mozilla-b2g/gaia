from gaiatest import GaiaTestCase
from gaiatest.apps.bzlite.app import Bzlite


class TestBugzillaLite(GaiaTestCase):
    def test_login_BugzillaLite(self):
        self.bzlite = Bzlite(self.marionette)
        slef.bzlite.launch()
        # enter the username and the password
        self.bzlite.login(self.testvars['bugzilla']['user'], self.testvars['bugzilla']['password'])
        # check the log in 
        self.assertTrue(self.bzlite.is_logged_in)

