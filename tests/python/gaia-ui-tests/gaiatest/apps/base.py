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


class Base(object):
    # deafult timeout in seconds for the wait_for methods
    _default_timeout = 30

    def __init__(self, marionette):
        self.marionette = marionette
        self.apps = GaiaApps(self.marionette)
        self.frame = None

    def launch(self, launch_timeout=None):
        self.app = self.apps.launch(self.name, launch_timeout=launch_timeout)

    def wait_for_element_present(self, by, locator, timeout=_default_timeout):
        timeout = float(timeout) + time.time()

        while time.time() < timeout:
            time.sleep(0.5)
            try:
                return self.marionette.find_element(by, locator)
            except NoSuchElementException:
                pass
        else:
            raise TimeoutException(
                'Element %s not found before timeout' % locator)

    def wait_for_element_not_present(self, by, locator, timeout=_default_timeout):
        timeout = float(timeout) + time.time()

        while time.time() < timeout:
            time.sleep(0.5)
            try:
                self.marionette.find_element(by, locator)
            except NoSuchElementException:
                break
        else:
            raise TimeoutException(
                'Element %s still present after timeout' % locator)

    def wait_for_element_displayed(self, by, locator, timeout=_default_timeout):
        timeout = float(timeout) + time.time()
        e = None
        while time.time() < timeout:
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

    def wait_for_element_not_displayed(self, by, locator, timeout=_default_timeout):
        timeout = float(timeout) + time.time()

        while time.time() < timeout:
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

    def wait_for_condition(self, method, timeout=_default_timeout, message="Condition timed out"):
        """Calls the method provided with the driver as an argument until the return value is not False."""
        end_time = time.time() + timeout
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
            self.marionette.set_search_timeout(10000)

    def is_element_displayed(self, by, locator):
        try:
            return self.marionette.find_element(by, locator).is_displayed()
        except (NoSuchElementException, ElementNotVisibleException):
            return False

    def select(self, match_string):
        # cheeky Select wrapper until Marionette has its own
        # due to the way B2G wraps the app's select box we match on text

        # have to go back to top level to get the B2G select box wrapper
        self.marionette.switch_to_frame()

        self.wait_for_condition(lambda m: len(self.marionette.find_elements(By.CSS_SELECTOR, '#value-selector-container li')) > 0)

        options = self.marionette.find_elements(By.CSS_SELECTOR, '#value-selector-container li')
        close_button = self.marionette.find_element(By.CSS_SELECTOR, 'button.value-option-confirm')

        # loop options until we find the match
        for li in options:
            if li.text == match_string:
                # TODO Remove scrollintoView upon resolution of bug 877651
                self.marionette.execute_script(
                    'arguments[0].scrollIntoView(false);', [li])
                li.tap()
                break

        close_button.tap()

        # now back to app
        self.launch()

    def dismiss_keyboard(self):
        # TODO: Switch back to the 'current' frame once bug 855327 is resolved
        frame = self.frame or self.apps.displayed_app.frame
        self.marionette.switch_to_frame()
        self.marionette.execute_script('navigator.mozKeyboard.removeFocus();')
        self.wait_for_condition(lambda m: m.find_element(By.CSS_SELECTOR, '#keyboard-frame iframe').location['y'] == 480)
        self.marionette.switch_to_frame(frame)


class PageRegion(Base):
    def __init__(self, marionette, element):
        self.root_element = element
        Base.__init__(self, marionette)
