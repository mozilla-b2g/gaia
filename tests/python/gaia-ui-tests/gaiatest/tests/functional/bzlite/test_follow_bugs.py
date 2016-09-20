from gaiatest import GaiaTestCase
from gaiatest.apps.bzlite.app import BugzillaLite

class testFollowBugs(GaiaTestCase):
    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

    def test_follow_bugs(self):
        bugzilla_lite = BugzillaLite(self.marionette)
        bugzilla_lite.launch()
        #bugzilla_lite.login(self.testvars['bugzilla']['user'], self.testvars['bugzilla']['password'])
        print'call function follow'
        bugzilla_lite.follow_bugs()
