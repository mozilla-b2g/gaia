# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import os
import time

from marionette import MarionetteTestCase
from marionette import Marionette
from marionette import MarionetteTouchMixin
from marionette.errors import NoSuchElementException
from marionette.errors import ElementNotVisibleException
from marionette.errors import TimeoutException


class LockScreen(object):

    def __init__(self, marionette):
        self.marionette = marionette
        js = os.path.abspath(os.path.join(__file__, os.path.pardir, 'atoms', "gaia_lock_screen.js"))
        self.marionette.import_script(js)

    @property
    def is_locked(self):
        return self.marionette.execute_script('window.wrappedJSObject.LockScreen.locked')

    def lock(self):
        result = self.marionette.execute_async_script('GaiaLockScreen.lock()')
        assert result, 'Unable to lock screen'

    def unlock(self):
        result = self.marionette.execute_async_script('GaiaLockScreen.unlock()')
        assert result, 'Unable to unlock screen'


class GaiaApp(object):

    def __init__(self, origin=None, name=None, frame_id=None, src=None):
        self.frame_id = frame_id
        self.src = src
        self.name = name
        self.origin = origin


class GaiaApps(object):

    def __init__(self, marionette):
        self.marionette = marionette
        js = os.path.abspath(os.path.join(__file__, os.path.pardir, 'atoms', "gaia_apps.js"))
        self.marionette.import_script(js)

    def launch(self, name, switch_to_frame=True, url=None):
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script("GaiaApps.launchWithName('%s')" % name)
        assert result, "Failed to launch app with name '%s'" % name
        app = GaiaApp(frame_id=result.get('frame'),
                      src=result.get('src'),
                      name=result.get('name'),
                      origin=result.get('origin'))
        if app.frame_id is None:
            raise Exception("App failed to launch; there is no app frame")
        if switch_to_frame:
            self.switch_to_frame(app.frame_id, url)
        return app

    def uninstall(self, name):
        self.marionette.execute_async_script("GaiaApps.uninstallWithName('%s')" % name)

    def kill(self, app):
        self.marionette.switch_to_frame()
        js = os.path.abspath(os.path.join(__file__, os.path.pardir, 'atoms', "gaia_apps.js"))
        self.marionette.import_script(js)
        result = self.marionette.execute_async_script("GaiaApps.kill('%s');" % app.origin)
        assert result, "Failed to kill app with name '%s'" % app.name

    def kill_all(self):
        self.marionette.switch_to_frame()
        js = os.path.abspath(os.path.join(__file__, os.path.pardir, 'atoms', "gaia_apps.js"))
        self.marionette.import_script(js)
        self.marionette.execute_async_script("GaiaApps.killAll()")

    def runningApps(self):
        apps = self.marionette.execute_script("""
return window.wrappedJSObject.WindowManager.getRunningApps();
            """)
        return apps

    def switch_to_frame(self, app_frame, url=None, timeout=30):
        self.marionette.switch_to_frame(app_frame)
        start = time.time()
        if not url:
            def check(now):
                return "about:blank" not in now
        else:
            def check(now):
                return url in now
        while (time.time() - start < timeout):
            if check(self.marionette.get_url()):
                return
            time.sleep(2)
        raise TimeoutException('Could not switch to app frame %s in time' % app_frame)


class GaiaData(object):

    def __init__(self, marionette):
        self.marionette = marionette
        js = os.path.abspath(os.path.join(__file__, os.path.pardir, 'atoms', "gaia_data_layer.js"))
        self.marionette.import_script(js)
        self.marionette.set_search_timeout(10000)

    def insert_contact(self, contact):
        self.marionette.execute_script("GaiaDataLayer.insertContact(%s)" % contact.json())

    def remove_contact(self, contact):
        self.marionette.execute_script("GaiaDataLayer.findAndRemoveContact(%s)" % contact.json())

    @property
    def all_settings(self):
        return self.marionette.execute_async_script('return GaiaDataLayer.getSetting("*")')

    def get_setting(self, name):
        return self.marionette.execute_async_script('return GaiaDataLayer.getSetting("%s")' % name)

    def set_setting(self, name, value):
        import json
        value = json.dumps(value)
        result = self.marionette.execute_async_script('return GaiaDataLayer.setSetting("%s", %s)' % (name, value))
        assert result, "Unable to change setting with name '%s' to '%s'" % (name, value)

    def set_volume(self, value):
        self.set_setting('audio.volume.master', value)

    def enable_cell_data(self):
        result = self.marionette.execute_async_script("return GaiaDataLayer.enableCellData()")
        assert result, 'Unable to enable cell data'

    def disable_cell_data(self):
        result = self.marionette.execute_async_script("return GaiaDataLayer.disableCellData()")
        assert result, 'Unable to disable cell data'

    def enable_cell_roaming(self):
        self.set_setting('ril.data.roaming_enabled', True)

    def disable_cell_roaming(self):
        self.set_setting('ril.data.roaming_enabled', False)

    def enable_wifi(self):
        result = self.marionette.execute_async_script("return GaiaDataLayer.enableWiFi()")
        assert result, 'Unable to enable WiFi'

    def disable_wifi(self):
        result = self.marionette.execute_async_script("return GaiaDataLayer.disableWiFi()")
        assert result, 'Unable to disable WiFi'

    def connect_to_wifi(self, network):
        result = self.marionette.execute_async_script("return GaiaDataLayer.connectToWiFi(%s)" % json.dumps(network))
        assert result, 'Unable to connect to WiFi network'

    def forget_all_networks(self):
        self.marionette.execute_async_script('return GaiaDataLayer.forgetAllNetworks()')

    def is_wifi_connected(self, network):
        return self.marionette.execute_script("return GaiaDataLayer.isWiFiConnected(%s)" % json.dumps(network))

    @property
    def known_networks(self):
        return self.marionette.execute_async_script('return GaiaDataLayer.getKnownNetworks()')

    @property
    def active_telephony_state(self):
        # Returns the state of only the currently active call or None if no active call
        return self.marionette.execute_script("return GaiaDataLayer.getMozTelephonyState()")

    @property
    def fm_state(self):
        return self.marionette.execute_script("return GaiaDataLayer.getFMHardwareState()")

    @property
    def fm_frequency(self):
        return self.marionette.execute_script("return GaiaDataLayer.getFMHardwareFrequency()")

class GaiaTestCase(MarionetteTestCase):

    def setUp(self):
        MarionetteTestCase.setUp(self)
        self.marionette.__class__ = type('Marionette', (Marionette, MarionetteTouchMixin), {})
        self.marionette.setup_touch()

        # the emulator can be really slow!
        self.marionette.set_script_timeout(60000)
        self.lockscreen = LockScreen(self.marionette)
        self.apps = GaiaApps(self.marionette)
        self.data_layer = GaiaData(self.marionette)

        # wifi is true if testvars includes wifi details and wifi manager is defined
        self.wifi = self.testvars and \
                    'wifi' in self.testvars and \
                    self.marionette.execute_script('return window.navigator.mozWifiManager !== undefined')

        self.cleanUp()

    def cleanUp(self):
        # unlock
        self.lockscreen.unlock()

        # kill any open apps
        self.apps.kill_all()

        # disable sound completely
        self.data_layer.set_volume(0)

        if self.wifi:
            # forget any known networks
            self.data_layer.enable_wifi()
            self.data_layer.forget_all_networks()
            self.data_layer.disable_wifi()

        # reset to home screen
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home'));")

    def wait_for_element_present(self, by, locator, timeout=10):
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

    def wait_for_element_not_present(self, by, locator, timeout=10):
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

    def wait_for_element_displayed(self, by, locator, timeout=10):
        timeout = float(timeout) + time.time()

        while time.time() < timeout:
            time.sleep(0.5)
            try:
                if self.marionette.find_element(by, locator).is_displayed():
                    break
            except NoSuchElementException:
                pass
        else:
            raise TimeoutException(
                'Element %s not visible before timeout' % locator)

    def wait_for_element_not_displayed(self, by, locator, timeout=10):
        timeout = float(timeout) + time.time()

        while time.time() < timeout:
            time.sleep(0.5)
            try:
                if not self.marionette.find_element(by, locator).is_displayed():
                    break
            except NoSuchElementException:
                break
        else:
            raise TimeoutException(
                'Element %s still visible after timeout' % locator)

    def wait_for_condition(self, method, timeout=10,
                           message="Condition timed out"):
        """Calls the method provided with the driver as an argument until the \
        return value is not False."""
        end_time = time.time() + timeout
        while time.time() < end_time:
            try:
                value = method(self.marionette)
                if value:
                    return value
            except NoSuchElementException:
                pass
            time.sleep(0.5)
        else:
            raise TimeoutException(message)

    def tearDown(self):
        self.lockscreen = None
        self.apps = None
        self.data_layer = None
        MarionetteTestCase.tearDown(self)
