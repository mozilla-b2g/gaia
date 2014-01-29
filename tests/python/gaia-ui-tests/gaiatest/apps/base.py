# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette.by import By
from marionette.errors import NoSuchElementException
from marionette.errors import ElementNotVisibleException
from marionette.errors import TimeoutException
from marionette.errors import StaleElementException

from gaiatest import GaiaApps
from gaiatest import GaiaData
from gaiatest import Accessibility


class Base(object):

    def __init__(self, marionette):
        self.marionette = marionette
        self.apps = GaiaApps(self.marionette)
        self.data_layer = GaiaData(self.marionette)
        self.accessibility = Accessibility(self.marionette)
        self.frame = None

    def launch(self, launch_timeout=None):
        self.app = self.apps.launch(self.name, launch_timeout=launch_timeout)

    def wait_for_element_present(self, by, locator, timeout=None):
        timeout = timeout or (self.marionette.timeout and self.marionette.timeout / 1000) or 30
        end_time = float(timeout) + time.time()

        while time.time() < end_time:
            time.sleep(0.5)
            try:
                return self.marionette.find_element(by, locator)
            except NoSuchElementException:
                pass
        else:
            raise TimeoutException(
                'Element %s not found before timeout' % locator)

    def wait_for_element_not_present(self, by, locator, timeout=None):
        timeout = timeout or (self.marionette.timeout and self.marionette.timeout / 1000) or 30
        end_time = float(timeout) + time.time()

        while time.time() < end_time:
            time.sleep(0.5)
            try:
                self.marionette.find_element(by, locator)
            except NoSuchElementException:
                break
        else:
            raise TimeoutException(
                'Element %s still present after timeout' % locator)

    def wait_for_element_displayed(self, by, locator, timeout=None):
        timeout = timeout or (self.marionette.timeout and self.marionette.timeout / 1000) or 30
        end_time = float(timeout) + time.time()
        e = None
        while time.time() < end_time:
            time.sleep(0.5)
            try:
                if self.marionette.find_element(by, locator).is_displayed():
                    break
            except (NoSuchElementException, StaleElementException, ElementNotVisibleException) as e:
                pass
        else:
            if isinstance(e, NoSuchElementException):
                raise TimeoutException('Element %s not present before timeout' % locator)
            else:
                raise TimeoutException('Element %s present but not displayed before timeout' % locator)

    def wait_for_element_not_displayed(self, by, locator, timeout=None):
        timeout = timeout or (self.marionette.timeout and self.marionette.timeout / 1000) or 30
        end_time = float(timeout) + time.time()

        while time.time() < end_time:
            time.sleep(0.5)
            try:
                if not self.marionette.find_element(by, locator).is_displayed():
                    break
            except StaleElementException:
                pass
            except NoSuchElementException:
                break
        else:
            raise TimeoutException(
                'Element %s still visible after timeout' % locator)

    def wait_for_condition(self, method, timeout=None, message="Condition timed out"):
        """Calls the method provided with the driver as an argument until the return value is not False."""
        timeout = timeout or (self.marionette.timeout and self.marionette.timeout / 1000) or 30
        end_time = float(timeout) + time.time()
        while time.time() < end_time:
            try:
                value = method(self.marionette)
                if value:
                    return value
            except (NoSuchElementException, StaleElementException):
                pass
            time.sleep(0.5)
        else:
            raise TimeoutException(message)

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
        try:
            return self.marionette.find_element(by, locator).is_displayed()
        except (NoSuchElementException, ElementNotVisibleException):
            return False

    def select(self, match_string):
        # cheeky Select wrapper until Marionette has its own
        # due to the way B2G wraps the app's select box we match on text

        _list_item_locator = (By.XPATH, "id('value-selector-container')/descendant::li[descendant::span[.='%s']]" % match_string)
        _close_button_locator = (By.CSS_SELECTOR, 'button.value-option-confirm')

        # have to go back to top level to get the B2G select box wrapper
        self.marionette.switch_to_frame()

        li = self.wait_for_element_present(*_list_item_locator)

       # TODO Remove scrollintoView upon resolution of bug 877651
        self.marionette.execute_script(
            'arguments[0].scrollIntoView(false);', [li])
        li.tap()

        close_button = self.marionette.find_element(*_close_button_locator)

        # Tap close and wait for it to hide
        close_button.tap()
        self.wait_for_element_not_displayed(*_close_button_locator)

        # now back to app
        self.apps.switch_to_displayed_app()

    @property
    def keyboard(self):
        from gaiatest.apps.keyboard.app import Keyboard
        return Keyboard(self.marionette)


class PageRegion(Base):
    def __init__(self, marionette, element):
        self.root_element = element
        Base.__init__(self, marionette)
