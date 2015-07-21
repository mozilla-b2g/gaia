from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.regions.confirm_install import ConfirmInstall
from gaiatest.apps.bzlite.app import BugzillaLiteStage

class TestSearchBug(GaiaTestCase):
     def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()
        self.connect_to_local_area_network() # <= No detail about how to connect
        name = 'Bugzilla Lite Stage'
        url = 'http://bzlite-staging.herokuapp.com/manifest.webapp'
        self.apps.install_app(name, url) # <= No detail about how to install

     def test_search_bug(self):
        bugzilla_lite = BugzillaLiteStage(self.marionette)
        bugzilla_lite.launch()

        bugzilla_lite.dismiss_tooltip()
        bugzilla_lite.dismiss_content()

        bugzilla_lite.login(self.testvars['bugzillaStage']['user'], self.testvars['bugzillaStage']['password'])

        bugzilla_lite.search(str(self.testvars['bugs']['bug2']))
        bugzilla_lite.cancelSearch()