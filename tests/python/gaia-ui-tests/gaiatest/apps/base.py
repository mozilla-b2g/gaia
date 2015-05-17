# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import By, Wait
from marionette_driver.errors import (NoSuchElementException,
                                      StaleElementException)

from gaiatest import GaiaApps
from gaiatest import Accessibility


class Base(object):

    def __init__(self, marionette):
        self.marionette = marionette
        self.apps = GaiaApps(self.marionette)
        self.accessibility = Accessibility(self.marionette)
        self.frame = None
        self.manifest_url = hasattr(self, 'manifest_url') and self.manifest_url or None
        self.entry_point = hasattr(self, 'entry_point') and self.entry_point or None

    def launch(self, launch_timeout=None):
        self.app = self.apps.launch(self.name, self.manifest_url, self.entry_point, launch_timeout=launch_timeout)

    def wait_for_element_present(self, by, locator, timeout=None):
        return Wait(self.marionette, timeout, ignored_exceptions=NoSuchElementException).until(
            lambda m: m.find_element(by, locator))

    def wait_for_element_not_present(self, by, locator, timeout=None):
        self.marionette.set_search_timeout(0)
        try:
            return Wait(self.marionette, timeout).until(
                lambda m: not m.find_element(by, locator))
        except NoSuchElementException:
            pass
        self.marionette.set_search_timeout(self.marionette.timeout or 10000)

    def wait_for_element_displayed(self, by, locator, timeout=None):
        Wait(self.marionette, timeout, ignored_exceptions=[NoSuchElementException, StaleElementException]).until(
            lambda m: m.find_element(by, locator).is_displayed())

    def wait_for_element_not_displayed(self, by, locator, timeout=None):
        self.marionette.set_search_timeout(0)
        try:
            Wait(self.marionette, timeout, ignored_exceptions=StaleElementException).until(
                lambda m: not m.find_element(by, locator).is_displayed())
        except NoSuchElementException:
            pass
        self.marionette.set_search_timeout(self.marionette.timeout or 10000)

    def wait_for_condition(self, method, timeout=None, message=None):
        Wait(self.marionette, timeout).until(method, message=message)

    def is_element_present(self, by, locator):
        self.marionette.set_search_timeout(0)
        try:
            self.marionette.find_element(by, locator)
            return True
        except NoSuchElementException:
            return False
        finally:
            self.marionette.set_search_timeout(self.marionette.timeout or 10000)

    def is_element_displayed(self, by, locator):
        self.marionette.set_search_timeout(0)
        try:
            return self.marionette.find_element(by, locator).is_displayed()
        except NoSuchElementException:
            return False
        finally:
            self.marionette.set_search_timeout(self.marionette.timeout or 10000)

    def find_select_item(self, match_string):
        _list_item_locator = (
            By.XPATH, "//section[contains(@class,'value-selector-container')]/descendant::li[descendant::span[.='%s']]" %
            match_string)
        # have to go back to top level to get the B2G select box wrapper
        self.marionette.switch_to_frame()
        # TODO we should find something suitable to wait for, but this goes too
        # fast against desktop builds causing intermittent failures
        time.sleep(0.2)

        li = self.wait_for_element_present(*_list_item_locator)
        # We need to keep this because the Ok button may hang over the element and stop
        # Marionette from scrolling the element entirely into view
        self.marionette.execute_script(
            'arguments[0].scrollIntoView(false);', [li])
        return li

    def wait_for_select_closed(self, by, locator):
        self.wait_for_element_not_displayed(by, locator)

        # now back to app
        self.apps.switch_to_displayed_app()

        # TODO we should find something suitable to wait for, but this goes too
        # fast against desktop builds causing intermittent failures
        # This sleep is necessary to make sure the select is completely faded out,
        # see bug 1148154
        time.sleep(1)

    def select(self, match_string, tap_close=True):
        # cheeky Select wrapper until Marionette has its own
        # due to the way B2G wraps the app's select box we match on text
        _close_button_locator = (By.CSS_SELECTOR, 'button.value-option-confirm')

        li = self.find_select_item(match_string)
        li.tap()

        # Tap close and wait for it to hide
        if tap_close:
          self.marionette.find_element(*_close_button_locator).tap()
        self.wait_for_select_closed(*_close_button_locator)

    def a11y_select(self, match_string):
        # Accessibility specific select method
        _close_button_locator = (By.CSS_SELECTOR, 'button.value-option-confirm')

        li = self.find_select_item(match_string)
        self.accessibility.click(li)

        # A11y click close and wait for it to hide
        self.accessibility.click(self.marionette.find_element(*_close_button_locator))
        self.wait_for_select_closed(*_close_button_locator)

    @property
    def keyboard(self):
        from gaiatest.apps.keyboard.app import Keyboard
        return Keyboard(self.marionette)


class PageRegion(Base):
    def __init__(self, marionette, element):
        self.root_element = element
        Base.__init__(self, marionette)
