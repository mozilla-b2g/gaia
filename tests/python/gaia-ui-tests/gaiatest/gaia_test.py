# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import os
import sys
import time

from marionette import MarionetteTestCase
from marionette.by import By
from marionette.errors import NoSuchElementException
from marionette.errors import ElementNotVisibleException
from marionette.errors import TimeoutException
from marionette.errors import StaleElementException
from marionette.errors import InvalidResponseException
import mozdevice


class LockScreen(object):

    def __init__(self, marionette):
        self.marionette = marionette
        js = os.path.abspath(os.path.join(__file__, os.path.pardir, 'atoms', "gaia_lock_screen.js"))
        self.marionette.import_script(js)

    @property
    def is_locked(self):
        self.marionette.switch_to_frame()
        return self.marionette.execute_script('window.wrappedJSObject.LockScreen.locked')

    def lock(self):
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script('GaiaLockScreen.lock()')
        assert result, 'Unable to lock screen'

    def unlock(self):
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script('GaiaLockScreen.unlock()')
        assert result, 'Unable to unlock screen'


class GaiaApp(object):

    def __init__(self, origin=None, name=None, frame=None, src=None):
        self.frame = frame
        self.frame_id = frame
        self.src = src
        self.name = name
        self.origin = origin

    def __eq__(self, other):
        return self.__dict__ == other.__dict__


class GaiaApps(object):

    def __init__(self, marionette):
        self.marionette = marionette
        js = os.path.abspath(os.path.join(__file__, os.path.pardir, 'atoms', "gaia_apps.js"))
        self.marionette.import_script(js)

    def get_permission(self, app_name, permission_name):
        return self.marionette.execute_async_script("return GaiaApps.getPermission('%s', '%s')" % (app_name, permission_name))

    def set_permission(self, app_name, permission_name, value):
        return self.marionette.execute_async_script("return GaiaApps.setPermission('%s', '%s', '%s')" %
                                                    (app_name, permission_name, value))

    def launch(self, name, switch_to_frame=True, url=None, launch_timeout=None):
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script("GaiaApps.launchWithName('%s')" % name, script_timeout=launch_timeout)
        assert result, "Failed to launch app with name '%s'" % name
        app = GaiaApp(frame=result.get('frame'),
                      src=result.get('src'),
                      name=result.get('name'),
                      origin=result.get('origin'))
        if app.frame_id is None:
            raise Exception("App failed to launch; there is no app frame")
        if switch_to_frame:
            self.switch_to_frame(app.frame_id, url)
        return app

    @property
    def displayed_app(self):
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script('return GaiaApps.displayedApp();')
        return GaiaApp(frame=result.get('frame'),
                       src=result.get('src'),
                       name=result.get('name'),
                       origin=result.get('origin'))

    def is_app_installed(self, app_name):
        self.marionette.switch_to_frame()
        return self.marionette.execute_async_script("GaiaApps.locateWithName('%s')" % app_name)

    def uninstall(self, name):
        self.marionette.switch_to_frame()
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
        return self.marionette.execute_script("return GaiaApps.getRunningApps()")

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

    def __init__(self, marionette, testvars=None):
        self.marionette = marionette
        self.testvars = testvars or {}
        js = os.path.abspath(os.path.join(__file__, os.path.pardir, 'atoms', "gaia_data_layer.js"))
        self.marionette.import_script(js)
        self.marionette.set_search_timeout(10000)

    def set_time(self, date_number):
        self.marionette.set_context(self.marionette.CONTEXT_CHROME)
        self.marionette.execute_script("window.navigator.mozTime.set(%s);" % date_number)
        self.marionette.set_context(self.marionette.CONTEXT_CONTENT)

    @property
    def all_contacts(self):
        self.marionette.switch_to_frame()
        return self.marionette.execute_async_script('return GaiaDataLayer.getAllContacts();', special_powers=True)

    @property
    def sim_contacts(self):
        self.marionette.switch_to_frame()
        return self.marionette.execute_async_script('return GaiaDataLayer.getSIMContacts();', special_powers=True)

    def insert_contact(self, contact):
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script('return GaiaDataLayer.insertContact(%s);' % json.dumps(contact), special_powers=True)
        assert result, 'Unable to insert contact %s' % contact

    def remove_all_contacts(self, default_script_timeout=60000):
        self.marionette.switch_to_frame()
        self.marionette.set_script_timeout(max(default_script_timeout, 1000 * len(self.all_contacts)))
        result = self.marionette.execute_async_script('return GaiaDataLayer.removeAllContacts();', special_powers=True)
        assert result, 'Unable to remove all contacts'
        self.marionette.set_script_timeout(default_script_timeout)

    def get_setting(self, name):
        return self.marionette.execute_async_script('return GaiaDataLayer.getSetting("%s")' % name, special_powers=True)

    @property
    def all_settings(self):
        return self.get_setting('*')

    def set_setting(self, name, value):
        import json
        value = json.dumps(value)
        result = self.marionette.execute_async_script('return GaiaDataLayer.setSetting("%s", %s)' % (name, value), special_powers=True)
        assert result, "Unable to change setting with name '%s' to '%s'" % (name, value)

    def set_volume(self, value):
        channels = ['alarm', 'content', 'notification']
        for channel in channels:
            self.set_setting('audio.volume.%s' % channel, value)

    def bluetooth_enable(self):
        self.marionette.switch_to_frame()
        return self.marionette.execute_async_script("return GaiaDataLayer.enableBluetooth()")

    def bluetooth_disable(self):
        self.marionette.switch_to_frame()
        return self.marionette.execute_async_script("return GaiaDataLayer.disableBluetooth()")

    def bluetooth_pair_device(self, device_name):
        return self.marionette.execute_async_script('return GaiaDataLayer.pairBluetoothDevice("%s")' % device_name)

    def bluetooth_unpair_all_devices(self):
        self.marionette.switch_to_frame()
        self.marionette.execute_async_script('return GaiaDataLayer.unpairAllBluetoothDevices()')

    def bluetooth_set_device_name(self, device_name):
        result = self.marionette.execute_async_script('return GaiaDataLayer.bluetoothSetDeviceName(%s);' % device_name)
        assert result, "Unable to set device's bluetooth name to %s" % device_name

    def bluetooth_set_device_discoverable_mode(self, discoverable):
        if (discoverable):
            result = self.marionette.execute_async_script('return GaiaDataLayer.bluetoothSetDeviceDiscoverableMode(true);')
        else:
            result = self.marionette.execute_async_script('return GaiaDataLayer.bluetoothSetDeviceDiscoverableMode(false);')
        assert result, 'Able to set the device bluetooth discoverable mode'

    @property
    def bluetooth_is_enabled(self):
        return self.marionette.execute_script("return window.navigator.mozBluetooth.enabled")

    @property
    def is_cell_data_enabled(self):
        return self.get_setting('ril.data.enabled')

    def connect_to_cell_data(self):
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script("return GaiaDataLayer.connectToCellData()", special_powers=True)
        assert result, 'Unable to connect to cell data'

    def disable_cell_data(self):
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script("return GaiaDataLayer.disableCellData()", special_powers=True)
        assert result, 'Unable to disable cell data'

    @property
    def is_cell_data_connected(self):
        return self.marionette.execute_script("return window.navigator.mozMobileConnection.data.connected;")

    def enable_cell_roaming(self):
        self.set_setting('ril.data.roaming_enabled', True)

    def disable_cell_roaming(self):
        self.set_setting('ril.data.roaming_enabled', False)

    @property
    def is_wifi_enabled(self):
        return self.marionette.execute_script("return window.navigator.mozWifiManager.enabled;")

    def enable_wifi(self):
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script("return GaiaDataLayer.enableWiFi()", special_powers=True)
        assert result, 'Unable to enable WiFi'

    def disable_wifi(self):
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script("return GaiaDataLayer.disableWiFi()", special_powers=True)
        assert result, 'Unable to disable WiFi'

    def connect_to_wifi(self, network=None):
        network = network or self.testvars.get('wifi')
        assert network, 'No WiFi network provided'
        self.enable_wifi()
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script("return GaiaDataLayer.connectToWiFi(%s)" % json.dumps(network))
        assert result, 'Unable to connect to WiFi network'

    def forget_all_networks(self):
        self.marionette.switch_to_frame()
        self.marionette.execute_async_script('return GaiaDataLayer.forgetAllNetworks()')

    def is_wifi_connected(self, network=None):
        network = network or self.testvars.get('wifi')
        assert network, 'No WiFi network provided'
        self.marionette.switch_to_frame()
        return self.marionette.execute_script("return GaiaDataLayer.isWiFiConnected(%s)" % json.dumps(network))

    @property
    def known_networks(self):
        return self.marionette.execute_async_script('return GaiaDataLayer.getKnownNetworks()')

    @property
    def active_telephony_state(self):
        # Returns the state of only the currently active call or None if no active call
        return self.marionette.execute_script("return GaiaDataLayer.getMozTelephonyState()")

    @property
    def is_antenna_available(self):
        return self.marionette.execute_script('return window.navigator.mozFMRadio.antennaAvailable')

    @property
    def is_fm_radio_enabled(self):
        return self.marionette.execute_script('return window.navigator.mozFMRadio.enabled')

    @property
    def fm_radio_frequency(self):
        return self.marionette.execute_script('return window.navigator.mozFMRadio.frequency')

    @property
    def media_files(self):
        result = []
        result.extend(self.music_files)
        result.extend(self.picture_files)
        result.extend(self.video_files)
        return result

    def delete_all_sms(self):
        self.marionette.switch_to_frame()
        return self.marionette.execute_async_script("return GaiaDataLayer.deleteAllSms();", special_powers=True)

    def delete_all_call_log_entries(self):
        """The call log needs to be open and focused in order for this to work."""
        self.marionette.execute_script('window.wrappedJSObject.RecentsDBManager.deleteAll();')

    def kill_active_call(self):
        self.marionette.execute_script("var telephony = window.navigator.mozTelephony; " +
                                       "if(telephony.active) telephony.active.hangUp();")

    @property
    def music_files(self):
        return self.marionette.execute_async_script(
            'return GaiaDataLayer.getAllMusic();')

    @property
    def picture_files(self):
        return self.marionette.execute_async_script(
            'return GaiaDataLayer.getAllPictures();')

    @property
    def video_files(self):
        return self.marionette.execute_async_script(
            'return GaiaDataLayer.getAllVideos();')

    def sdcard_files(self, extension=''):
        files = self.marionette.execute_async_script(
            'return GaiaDataLayer.getAllSDCardFiles();')
        if len(extension):
            return [filename for filename in files if filename.endswith(extension)]
        return files


class GaiaDevice(object):

    def __init__(self, marionette, testvars=None):
        self.marionette = marionette
        self.testvars = testvars or {}

    @property
    def manager(self):
        if hasattr(self, '_manager') and self._manager:
            return self._manager

        if not self.is_android_build:
            raise Exception('Device manager is only available for devices.')

        dm_type = os.environ.get('DM_TRANS', 'adb')
        if dm_type == 'adb':
            self._manager = mozdevice.DeviceManagerADB()
        elif dm_type == 'sut':
            host = os.environ.get('TEST_DEVICE')
            if not host:
                raise Exception('Must specify host with SUT!')
            self._manager = mozdevice.DeviceManagerSUT(host=host)
        else:
            raise Exception('Unknown device manager type: %s' % dm_type)
        return self._manager

    @property
    def is_android_build(self):
        if self.testvars.get('is_android_build') is None:
            self.testvars['is_android_build'] = 'Android' in self.marionette.session_capabilities['platform']
        return self.testvars['is_android_build']

    @property
    def is_online(self):
        # Returns true if the device has a network connection established (cell data, wifi, etc)
        return self.marionette.execute_script('return window.navigator.onLine;')

    @property
    def has_mobile_connection(self):
        return self.marionette.execute_script('return window.navigator.mozMobileConnection !== undefined')

    @property
    def has_wifi(self):
        if not hasattr(self, '_has_wifi'):
            self._has_wifi = self.marionette.execute_script('return window.navigator.mozWifiManager !== undefined')
        return self._has_wifi

    def push_file(self, source, count=1, destination='', progress=None):
        if not destination.count('.') > 0:
            destination = '/'.join([destination, source.rpartition(os.path.sep)[-1]])
        self.manager.mkDirs(destination)
        self.manager.pushFile(source, destination)

        if count > 1:
            for i in range(1, count + 1):
                remote_copy = '_%s.'.join(iter(destination.split('.'))) % i
                self.manager._checkCmd(['shell', 'dd', 'if=%s' % destination, 'of=%s' % remote_copy])
                if progress:
                    progress.update(i)

            self.manager.removeFile(destination)

    def restart_b2g(self):
        self.stop_b2g()
        time.sleep(2)
        self.start_b2g()

    def start_b2g(self):
        if self.marionette.instance:
            # launch the gecko instance attached to marionette
            self.marionette.instance.start()
        elif self.is_android_build:
            self.manager.shellCheckOutput(['start', 'b2g'])
        else:
            raise Exception('Unable to start B2G')
        self.marionette.wait_for_port()
        self.marionette.start_session()
        if self.is_android_build:
            self.marionette.execute_async_script("""
window.addEventListener('mozbrowserloadend', function loaded(aEvent) {
  if (aEvent.target.src.indexOf('ftu') != -1 || aEvent.target.src.indexOf('homescreen') != -1) {
    window.removeEventListener('mozbrowserloadend', loaded);
    marionetteScriptFinished();
  }
});""", script_timeout=60000)
            # TODO: Remove this sleep when Bug 924912 is addressed
            time.sleep(5)

    def stop_b2g(self):
        if self.marionette.instance:
            # close the gecko instance attached to marionette
            self.marionette.instance.close()
        elif self.is_android_build:
            self.manager.shellCheckOutput(['stop', 'b2g'])
        else:
            raise Exception('Unable to stop B2G')
        self.marionette.client.close()
        self.marionette.session = None
        self.marionette.window = None


class GaiaTestCase(MarionetteTestCase):

    _script_timeout = 60000
    _search_timeout = 10000

    # deafult timeout in seconds for the wait_for methods
    _default_timeout = 30

    def __init__(self, *args, **kwargs):
        self.restart = kwargs.pop('restart', False)
        kwargs.pop('iterations', None)
        kwargs.pop('checkpoint_interval', None)
        MarionetteTestCase.__init__(self, *args, **kwargs)

    def setUp(self):
        try:
            MarionetteTestCase.setUp(self)
        except InvalidResponseException:
            if self.restart:
                pass

        self.device = GaiaDevice(self.marionette, self.testvars)
        if self.restart and (self.device.is_android_build or self.marionette.instance):
            self.device.stop_b2g()
            if self.device.is_android_build:
                # revert device to a clean state
                self.device.manager.removeDir('/data/local/storage/persistent')
                self.device.manager.removeDir('/data/b2g/mozilla')
            self.device.start_b2g()

        # the emulator can be really slow!
        self.marionette.set_script_timeout(self._script_timeout)
        self.marionette.set_search_timeout(self._search_timeout)
        self.lockscreen = LockScreen(self.marionette)
        self.apps = GaiaApps(self.marionette)
        self.data_layer = GaiaData(self.marionette, self.testvars)
        from gaiatest.apps.keyboard.app import Keyboard
        self.keyboard = Keyboard(self.marionette)

        self.cleanUp()

    def cleanUp(self):
        # remove media
        if self.device.is_android_build:
            for filename in self.data_layer.media_files:
                # filename is a fully qualified path
                self.device.manager.removeFile(filename)

        # Switch off keyboard FTU screen
        self.data_layer.set_setting("keyboard.ftu.enabled", False)

        # Change timezone back to PST
        self.data_layer.set_setting("time.timezone", "America/Los_Angeles")
        self.data_layer.set_setting("time.timezone.user-selected", "America/Los_Angeles")

        # restore settings from testvars
        [self.data_layer.set_setting(name, value) for name, value in self.testvars.get('settings', {}).items()]

        # unlock
        self.lockscreen.unlock()

        # If we are restarting all of these values are reset to default earlier in the setUp
        if not self.restart:

            # disable passcode before restore settings from testvars
            self.data_layer.set_setting('lockscreen.passcode-lock.code', '1111')
            self.data_layer.set_setting('lockscreen.passcode-lock.enabled', False)

            # Change language back to English
            self.data_layer.set_setting("language.current", "en-US")

            # Switch off spanish keyboard before test
            self.data_layer.set_setting("keyboard.layouts.spanish", False)

            # Set do not track pref back to the default
            self.data_layer.set_setting('privacy.donottrackheader.value', '-1')


            if self.data_layer.get_setting('ril.radio.disabled'):
                # enable the device radio, disable Airplane mode
                self.data_layer.set_setting('ril.radio.disabled', False)

            # disable carrier data connection
            if self.device.has_mobile_connection:
                self.data_layer.disable_cell_data()

            self.data_layer.disable_cell_roaming()

            if self.device.has_wifi:
                self.data_layer.enable_wifi()
                self.data_layer.forget_all_networks()
                self.data_layer.disable_wifi()

            # remove data
            self.data_layer.remove_all_contacts(self._script_timeout)

            # reset to home screen
            self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home'));")

        # kill any open apps
        self.apps.kill_all()

        # disable sound completely
        self.data_layer.set_volume(0)


    def install_marketplace(self):
        _yes_button_locator = (By.ID, 'app-install-install-button')
        mk = {"name": "Marketplace Dev",
              "manifest": "https://marketplace-dev.allizom.org/manifest.webapp ",
              }

        if not self.apps.is_app_installed(mk['name']):
            # install the marketplace dev app
            self.marionette.execute_script('navigator.mozApps.install("%s")' % mk['manifest'])

            # TODO add this to the system app object when we have one
            self.wait_for_element_displayed(*_yes_button_locator)
            self.marionette.find_element(*_yes_button_locator).tap()
            self.wait_for_element_not_displayed(*_yes_button_locator)

    def connect_to_network(self):
        if not self.device.is_online:
            try:
                self.connect_to_local_area_network()
            except:
                if self.device.has_mobile_connection:
                    self.data_layer.connect_to_cell_data()
                else:
                    raise Exception('Unable to connect to network')
        assert self.device.is_online

    def connect_to_local_area_network(self):
        if not self.device.is_online:
            if self.testvars.get('wifi') and self.device.has_wifi:
                self.data_layer.connect_to_wifi()
                assert self.device.is_online
            else:
                raise Exception('Unable to connect to local area network')

    def push_resource(self, filename, count=1, destination=''):
        self.device.push_file(self.resource(filename), count, '/'.join(['sdcard', destination]))

    def resource(self, filename):
        return os.path.abspath(os.path.join(os.path.dirname(__file__), 'resources', filename))

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
                'Element %s not present before timeout' % locator)

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
            except (NoSuchElementException, StaleElementException) as e:
                pass
        else:
            # This is an effortless way to give extra debugging information
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

    def wait_for_condition(self, method, timeout=_default_timeout,
                           message="Condition timed out"):
        """Calls the method provided with the driver as an argument until the \
        return value is not False."""
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
        try:
            self.marionette.find_element(by, locator)
            return True
        except:
            return False

    def is_element_displayed(self, by, locator):
        try:
            return self.marionette.find_element(by, locator).is_displayed()
        except (NoSuchElementException, ElementNotVisibleException):
            return False

    def tearDown(self):
        self.lockscreen = None
        self.apps = None
        self.data_layer = None
        MarionetteTestCase.tearDown(self)


class GaiaEnduranceTestCase(GaiaTestCase):

    def __init__(self, *args, **kwargs):
        self.iterations = kwargs.pop('iterations') or 1
        self.checkpoint_interval = kwargs.pop('checkpoint_interval') or self.iterations
        GaiaTestCase.__init__(self, *args, **kwargs)

    def drive(self, test, app):
        self.test_method = test
        self.app_under_test = app

        # Now drive the actual test case iterations
        for count in range(1, self.iterations + 1):
            self.iteration = count
            self.marionette.log("%s iteration %d of %d" % (self.test_method.__name__, count, self.iterations))
            # Print to console so can see what iteration we're on while test is running
            if self.iteration == 1:
                print "\n"
            print "Iteration %d of %d..." % (count, self.iterations)
            sys.stdout.flush()

            self.test_method()
            # Checkpoint time?
            if ((count % self.checkpoint_interval) == 0) or count == self.iterations:
                self.checkpoint()

        # Finished, now process checkpoint data into .json output
        self.process_checkpoint_data()

    def checkpoint(self):
        # Console output so know what's happening if watching console
        print "Checkpoint..."
        sys.stdout.flush()
        # Sleep to give device idle time (for gc)
        idle_time = 30
        self.marionette.log("sleeping %d seconds to give the device some idle time" % idle_time)
        time.sleep(idle_time)

        # Dump out some memory status info
        self.marionette.log("checkpoint")
        self.cur_time = time.strftime("%Y%m%d%H%M%S", time.localtime())
        # If first checkpoint, create the file if it doesn't exist already
        if self.iteration in (0, self.checkpoint_interval):
            self.checkpoint_path = "checkpoints"
            if not os.path.exists(self.checkpoint_path):
                os.makedirs(self.checkpoint_path, 0755)
            self.log_name = "%s/checkpoint_%s_%s.log" % (self.checkpoint_path, self.test_method.__name__, self.cur_time)
            with open(self.log_name, 'a') as log_file:
                log_file.write('%s Gaia Endurance Test: %s\n' % (self.cur_time, self.test_method.__name__))
        output_str = self.device.manager.shellCheckOutput(["b2g-ps"])
        with open(self.log_name, 'a') as log_file:
            log_file.write('%s Checkpoint after iteration %d of %d:\n' % (self.cur_time, self.iteration, self.iterations))
            log_file.write('%s\n' % output_str)

    def close_app(self):
        # Close the current app (self.app) by using the home button
        self.marionette.switch_to_frame()
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home'));")

        # Bring up the cards view
        _cards_view_locator = ('id', 'cards-view')
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('holdhome'));")
        self.wait_for_element_displayed(*_cards_view_locator)

        # Sleep a bit
        time.sleep(5)

        # Tap the close icon for the current app
        locator_part_two = '#cards-view li.card[data-origin*="%s"] .close-card' % self.app_under_test.lower()
        _close_button_locator = ('css selector', locator_part_two)
        close_card_app_button = self.marionette.find_element(*_close_button_locator)
        close_card_app_button.tap()

    def process_checkpoint_data(self):
        # Process checkpoint data into .json
        self.marionette.log("processing checkpoint data from %s" % self.log_name)

        # Open the checkpoint file
        checkpoint_file = open(self.log_name, 'r')

        # Grab every b2g rss reading for each checkpoint
        b2g_rss_list = []
        for next_line in checkpoint_file:
            if next_line.startswith("b2g"):
                b2g_rss_list.append(next_line.split()[5])

        # Close the checkpoint file
        checkpoint_file.close()

        # Calculate the average b2g_rss
        total = 0
        for b2g_mem_value in b2g_rss_list:
            total+=int(b2g_mem_value)
        avg_rss = total/len(b2g_rss_list)

        # Create a summary text file
        summary_name = self.log_name.replace('.log', '_summary.log')
        summary_file = open(summary_name, 'w')

        # Write the summarized checkpoint data
        summary_file.write('test_name: %s\n' % self.test_method.__name__)
        summary_file.write('completed: %s\n' % self.cur_time)
        summary_file.write('app_under_test: %s\n' % self.app_under_test.lower())
        summary_file.write('total_iterations: %d\n' % self.iterations)
        summary_file.write('checkpoint_interval: %d\n' % self.checkpoint_interval)
        summary_file.write('b2g_rss: ')
        summary_file.write(', '.join(b2g_rss_list))
        summary_file.write('\navg_rss: %d\n\n' % avg_rss)

        # Close the summary file
        summary_file.close()

        # Write to suite summary file
        suite_summary_file_name = '%s/avg_b2g_rss_suite_summary.log' % self.checkpoint_path
        suite_summary_file = open(suite_summary_file_name, 'a')
        suite_summary_file.write('%s: %s\n' % (self.test_method.__name__, avg_rss))
        suite_summary_file.close()
