from gaiatest import GaiaTestCase
from gaiatest.apps.bzlite.app import Bugzilla_Lite


class TestBugzillaLite(GaiaTestCase):
    def test_login_BugzillaLite(self):
        Bugzilla_Lite = Bugzilla_Lite(marionette)
        Bugzilla_Lite.launch()
        self.BugzillaLite.login(self.testvars['bugzilla']['user'], self.testvars['bugzilla']['password'])
        self.assertTrue(self.BugzillaLite.is_logged_in)

