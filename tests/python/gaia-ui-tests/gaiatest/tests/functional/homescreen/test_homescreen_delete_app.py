# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.marionette import Actions

from gaiatest import GaiaTestCase


class TestDeleteApp(GaiaTestCase):

    MANIFEST = 'http://mozqa.com/data/webapps/mozqa.com/manifest.webapp'
    APP_NAME = 'Mozilla QA WebRT Tester'
    APP_INSTALLED = False

    _visible_icon_locator = (By.CSS_SELECTOR, 'div.page[style*="transform: translateX(0px);"] li.icon[aria-label="%s"]' % APP_NAME)
    _delete_app_locator = (By.CSS_SELECTOR, 'li.icon[aria-label="%s"] span.options' % APP_NAME)

    # App install popup
    _yes_button_locator = (By.ID, 'app-install-install-button')
    _notification_banner_locator = (By.ID, 'system-banner')

    # Delete popup
    _confirm_delete_locator = (By.ID, 'confirm-dialog-confirm-button')

    def setUp(self):
        GaiaTestCase.setUp(self)

        if self.apps.is_app_installed(self.APP_NAME):
            self.apps.uninstall(self.APP_NAME)

        self.connect_to_network()
        self.homescreen = self.apps.launch('Homescreen')

    def test_delete_app(self):

        # install app
        self.marionette.switch_to_frame()
        self.marionette.execute_script(
            'navigator.mozApps.install("%s")' % self.MANIFEST)

        # click YES on the installation dialog and wait for icon displayed
        self.wait_for_element_displayed(*self._yes_button_locator)
        self.marionette.find_element(*self._yes_button_locator).tap()

        # wait for the app to be installed and the notification banner to be available
        self.wait_for_element_displayed(*self._notification_banner_locator)
        self.wait_for_element_not_displayed(*self._notification_banner_locator)

        self.marionette.switch_to_frame(self.homescreen.frame)

        # switch pages until the app is found
        while True:
            if self.is_element_present(*self._visible_icon_locator):
                break
            if self._homescreen_has_more_pages():
                self._go_to_next_page()
            else:
                break

        # check that the app is available
        app_icon = self.marionette.find_element(*self._visible_icon_locator)
        self.assertTrue(app_icon.is_displayed())

        # go to edit mode
        Actions(self.marionette). \
            press(app_icon). \
            wait(3). \
            release(). \
            perform()

        # Tap on the (x) to start delete process
        self.wait_for_element_displayed(*self._delete_app_locator)
        self.marionette.find_element(*self._delete_app_locator).tap()

        # Tap on the confirm delete button
        self.wait_for_element_displayed(*self._confirm_delete_locator)
        self.marionette.find_element(*self._confirm_delete_locator).tap()

        self.wait_for_element_not_present(*self._visible_icon_locator)

        # return to normal mode
        self.marionette.switch_to_frame()
        self._touch_home_button()

        # check that the app is no longer available
        with self.assertRaises(AssertionError):
            self.apps.launch(self.APP_NAME)

    def _touch_home_button(self):
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home'));")

    def _go_to_next_page(self):
        self.marionette.execute_script('window.wrappedJSObject.GridManager.goToNextPage()')
        self.wait_for_condition(lambda m: m.find_element('tag name', 'body')
            .get_attribute('data-transitioning') != 'true')

    def _homescreen_has_more_pages(self):
        # the naming of this could be more concise when it's in an app object!
        return self.marionette.execute_script("""
            var pageHelper = window.wrappedJSObject.GridManager.pageHelper;
            return pageHelper.getCurrentPageNumber() < (pageHelper.getTotalPagesNumber() - 1);""")
