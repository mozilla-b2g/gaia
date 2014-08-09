# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import os

from marionette.by import By
from marionette import expected
from marionette.errors import NoSuchElementException
from marionette.errors import StaleElementException
from marionette.errors import InvalidResponseException
from marionette.wait import Wait

from file_manager import GaiaDeviceFileManager, GaiaLocalFileManager
from data_manager import GaiaDataManager


class GaiaDevice(object):

    def __init__(self, marionette, testvars=None, manager=None):
        self.manager = manager
        self.marionette = marionette
        self.testvars = testvars or {}

        if self.is_desktop_b2g:
            self.file_manager = GaiaLocalFileManager(self)
            # Use a temporary directory for storage
            self.storage_path = tempfile.mkdtemp()
            self._set_storage_path()
        elif self.manager:
            self.file_manager = GaiaDeviceFileManager(self)
            # Use the device root for storage
            self.storage_path = self.manager.deviceRoot

        self.lockscreen_atom = os.path.abspath(
            os.path.join(__file__, os.path.pardir, 'atoms', "gaia_lock_screen.js"))

    def _set_storage_path(self):
        if self.is_desktop_b2g:
            # Override the storage location for desktop B2G. This will only
            # work if the B2G instance is running locally.
            GaiaDataManager(self.marionette).set_char_pref(
                'device.storage.overrideRootDir', self.storage_path)

    @property
    def is_android_build(self):
        if self.testvars.get('is_android_build') is None:
            self.testvars['is_android_build'] = 'android' in self.marionette.session_capabilities['platformName'].lower()
        return self.testvars['is_android_build']

    @property
    def is_emulator(self):
        if not hasattr(self, '_is_emulator'):
            self._is_emulator = self.marionette.session_capabilities['device'] == 'qemu'
        return self._is_emulator

    @property
    def is_desktop_b2g(self):
        if self.testvars.get('is_desktop_b2g') is None:
            self.testvars['is_desktop_b2g'] = self.marionette.session_capabilities['device'] == 'desktop'
        return self.testvars['is_desktop_b2g']

    @property
    def is_online(self):
        # Returns true if the device has a network connection established (cell data, wifi, etc)
        return self.marionette.execute_script('return window.navigator.onLine;')

    @property
    def has_mobile_connection(self):
        # XXX: check bug-926169
        # this is used to keep all tests passing while introducing multi-sim APIs
        return self.marionette.execute_script('var mobileConnection = window.navigator.mozMobileConnection || ' +
                                              'window.navigator.mozMobileConnections && ' +
                                              'window.navigator.mozMobileConnections[0]; ' +
                                              'return mobileConnection !== undefined')

    @property
    def has_wifi(self):
        if not hasattr(self, '_has_wifi'):
            self._has_wifi = self.marionette.execute_script('return window.navigator.mozWifiManager !== undefined')
        return self._has_wifi

    def restart_b2g(self):
        self.stop_b2g()
        time.sleep(2)
        self.start_b2g()

    def start_b2g(self, timeout=60):
        if self.marionette.instance:
            # launch the gecko instance attached to marionette
            self.marionette.instance.start()
        elif self.is_android_build:
            self.manager.shellCheckOutput(['start', 'b2g'])
        else:
            raise Exception('Unable to start B2G')
        self.marionette.wait_for_port()
        self.marionette.start_session()

        self.wait_for_b2g_ready(timeout)

        # Reset the storage path for desktop B2G
        self._set_storage_path()

    def wait_for_b2g_ready(self, timeout):
        # Wait for the homescreen to finish loading
        Wait(self.marionette, timeout).until(expected.element_present(
            By.CSS_SELECTOR, '#homescreen[loading-state=false]'))

    @property
    def is_b2g_running(self):
        return 'b2g' in self.manager.shellCheckOutput(['toolbox', 'ps'])

    def stop_b2g(self, timeout=5):
        if self.marionette.instance:
            # close the gecko instance attached to marionette
            self.marionette.instance.close()
        elif self.is_android_build:
            self.manager.shellCheckOutput(['stop', 'b2g'])
            Wait(self.marionette, timeout=timeout).until(
                lambda m: not self.is_b2g_running,
                message='b2g failed to stop.')
        else:
            raise Exception('Unable to stop B2G')
        self.marionette.client.close()
        self.marionette.session = None
        self.marionette.window = None

    def press_sleep_button(self):
        self.marionette.execute_script("""
            window.wrappedJSObject.dispatchEvent(new CustomEvent('mozChromeEvent', {
              detail: {
                type: 'sleep-button-press'
              }
            }));""")

    def press_release_volume_up_then_down_n_times(self, n_times):
        self.marionette.execute_script("""
            function sendEvent(aName, aType) {
              window.wrappedJSObject.dispatchEvent(new CustomEvent('mozChromeEvent', {
                detail: {
                  type: aName + '-button-' + aType
                }
              }));
            }
            for (var i = 0; i < arguments[0]; ++i) {
              sendEvent('volume-up', 'press');
              sendEvent('volume-up', 'release');
              sendEvent('volume-down', 'press');
              sendEvent('volume-down', 'release');
            };""", script_args=[n_times])

    def turn_screen_off(self):
        self.marionette.execute_script("window.wrappedJSObject.ScreenManager.turnScreenOff(true)")

    @property
    def is_screen_enabled(self):
        return self.marionette.execute_script('return window.wrappedJSObject.ScreenManager.screenEnabled')

    def touch_home_button(self):
        from gaia_test import GaiaApps
        apps = GaiaApps(self.marionette)
        if apps.displayed_app.name.lower() != 'homescreen':
            # touching home button will return to homescreen
            self._dispatch_home_button_event()
            Wait(self.marionette).until(
                lambda m: apps.displayed_app.name.lower() == 'homescreen')
            apps.switch_to_displayed_app()
        else:
            apps.switch_to_displayed_app()
            mode = self.marionette.find_element(By.TAG_NAME, 'body').get_attribute('class')
            self._dispatch_home_button_event()
            apps.switch_to_displayed_app()
            if mode == 'edit-mode':
                # touching home button will exit edit mode
                Wait(self.marionette).until(lambda m: m.find_element(
                    By.TAG_NAME, 'body').get_attribute('class') != mode)
            else:
                # touching home button inside homescreen will scroll it to the top
                Wait(self.marionette).until(lambda m: m.execute_script(
                    "return document.querySelector('.scrollable').scrollTop") == 0)

    def _dispatch_home_button_event(self):
        self.marionette.switch_to_frame()
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home'));")

    def hold_home_button(self):
        self.marionette.switch_to_frame()
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('holdhome'));")

    def hold_sleep_button(self):
        self.marionette.switch_to_frame()
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('holdsleep'));")

    @property
    def is_locked(self):
        self.marionette.switch_to_frame()
        return self.marionette.execute_script('return window.wrappedJSObject.lockScreen.locked')

    def lock(self):
        self.marionette.import_script(self.lockscreen_atom)
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script('GaiaLockScreen.lock()')
        assert result, 'Unable to lock screen'
        Wait(self.marionette).until(lambda m: m.find_element(By.CSS_SELECTOR, 'div.lockScreenWindow.active'))

    def unlock(self):
        self.marionette.import_script(self.lockscreen_atom)
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script('GaiaLockScreen.unlock()')
        assert result, 'Unable to unlock screen'

    def change_orientation(self, orientation):
        """  There are 4 orientation states which the phone can be passed in:
        portrait-primary(which is the default orientation), landscape-primary, portrait-secondary and landscape-secondary
        """
        self.marionette.execute_async_script("""
            if (arguments[0] === arguments[1]) {
              marionetteScriptFinished();
            }
            else {
              var expected = arguments[1];
              window.screen.onmozorientationchange = function(e) {
                console.log("Received 'onmozorientationchange' event.");
                waitFor(
                  function() {
                    window.screen.onmozorientationchange = null;
                    marionetteScriptFinished();
                  },
                  function() {
                    return window.screen.mozOrientation === expected;
                  }
                );
              };
              console.log("Changing orientation to '" + arguments[1] + "'.");
              window.screen.mozLockOrientation(arguments[1]);
            };""", script_args=[self.screen_orientation, orientation])

    @property
    def screen_width(self):
        return self.marionette.execute_script('return window.screen.width')

    @property
    def screen_orientation(self):
        return self.marionette.execute_script('return window.screen.mozOrientation')
