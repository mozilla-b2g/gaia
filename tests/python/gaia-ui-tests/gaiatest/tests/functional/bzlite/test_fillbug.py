from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.regions.confirm_install import ConfirmInstall
from gaiatest.apps.bzlite.app import BugzillaLite

class TestFillBug(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()
        self.test_data = {
            'name': 'Bugzilla Lite',
            'url': 'http://bzlite-staging.herokuapp.com/manifest.webapp'}
        self.logger.info('Test data: %s' % self.test_data)
        self.marionette.execute_script(
            'navigator.mozApps.install("%s")' % self.test_data['url'])

        confirm_install = ConfirmInstall(self.marionette)
        confirm_install.tap_confirm()
        self.apps.uninstall('Bugzilla Lite')

    def test_fill_new_Bug(self):
        bugzilla_lite = BugzillaLite(self.marionette)
        bugzilla_lite.launch()
        bugzilla_lite.dismiss_tooltip()
        bugzilla_lite.create_new_bug(self.testvars['fillbug']['title'], self.testvars['fillbug']['description'])
