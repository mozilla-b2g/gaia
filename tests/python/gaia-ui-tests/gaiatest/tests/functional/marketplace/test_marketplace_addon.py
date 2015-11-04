# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, Wait
from gaiatest import GaiaTestCase
from gaiatest.apps.base import Base, PageRegion
from gaiatest.apps.marketplace.app import MarketplaceDev
from gaiatest.apps.settings.app import Settings
from gaiatest.apps.system.app import System


class StatusBarAddon(PageRegion):
    _root_locator = (By.CSS_SELECTOR, '#statusbar [id="statusbar-m"]')

    def __init__(self, marionette):
        marionette.switch_to_frame()
        Base.__init__(self, marionette)
        self.root_element = marionette.find_element(*self._root_locator)

    @property
    def is_displayed(self):
        self.marionette.switch_to_frame()
        # Workaround because is_displayed() doesn't work here
        return (self.root_element.rect['x'] != 0 and
                self.root_element.rect['y'] != 0 and
                self.root_element.rect['width'] != 0 and
                self.root_element.rect['height'] != 0)

    @property
    def text(self):
        self.marionette.switch_to_frame()
        # workaround because is_displayed doesn't work here
        return self.marionette.execute_script('return arguments[0].innerHTML', [self.root_element])

    @property
    def instances(self):
        system = System(self.marionette)
        status_bar = system.status_bar
        elements = status_bar.root_element.find_elements(*self._root_locator)
        return len(elements)

class TestSearchMarketplaceAndInstallAddon(GaiaTestCase):

    addon_name_to_install = "'M' in Status Bar"
    addon_url = 'm-in-status-bar'
    pref_certs = 'dom.mozApps.use_reviewer_certs'
    pref_install = 'dom.mozApps.signed_apps_installable_from'
    _status_bar_m_locator = (By.CSS_SELECTOR, '#statusbar-maximized [id="statusbar-m"]')

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.data_layer.set_bool_pref(self.pref_certs, True)
        self.data_layer.set_char_pref(self.pref_install,
            'https://marketplace.firefox.com,https://marketplace-dev.allizom.org')
        self.connect_to_local_area_network()

    def test_search_and_install_app(self):

        marketplace = MarketplaceDev(self.marionette)
        marketplace.launch()

        marketplace.install_addon(self.addon_url)

        settings = Settings(self.marionette)
        settings.launch()
        addons_page = settings.open_addons()

        for addon in addons_page.items:
            if addon.name == self.addon_name_to_install:
                addon_details = addon.tap()
                break
        else:
            self.fail('{} was not found in {}'.format(self.addon_name_to_install, addons_page.items))

        self.assertTrue(addon_details.is_enabled)
        self.assertEquals(addon_details.description, "Adds a 'M' to the status bar")
        # Disabled because of bug 1220742
        # self.assertEquals(self.apps.is_app_installed(addon_details.affected_apps)['name'], 'System')

        status_bar_addon = StatusBarAddon(self.marionette)
        self.assertEquals(status_bar_addon.instances, 1)
        self.assertTrue(status_bar_addon.is_displayed)
        self.assertEquals(status_bar_addon.text, 'M')

    def tearDown(self):
        self.data_layer.clear_user_pref(self.pref_certs)
        self.data_layer.clear_user_pref(self.pref_install)
        GaiaTestCase.tearDown(self)
