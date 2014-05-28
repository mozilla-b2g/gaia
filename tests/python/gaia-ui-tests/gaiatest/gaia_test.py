# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import os
import time

from marionette import MarionetteTestCase, EnduranceTestCaseMixin, \
    B2GTestCaseMixin, MemoryEnduranceTestCaseMixin
from marionette.by import By
from marionette.errors import NoSuchElementException
from marionette.errors import StaleElementException
from marionette.errors import TimeoutException
from marionette.errors import InvalidResponseException
from marionette.wait import Wait


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

    def launch(self, name, switch_to_frame=True, launch_timeout=None):
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
            self.marionette.switch_to_frame(app.frame_id)
        return app

    @property
    def displayed_app(self):
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script('return GaiaApps.displayedApp();')
        return GaiaApp(frame=result.get('frame'),
                       src=result.get('src'),
                       name=result.get('name'),
                       origin=result.get('origin'))

    def switch_to_displayed_app(self):
        self.marionette.switch_to_default_content()
        self.marionette.switch_to_frame(self.displayed_app.frame)

    def is_app_installed(self, app_name):
        self.marionette.switch_to_frame()
        return self.marionette.execute_async_script("GaiaApps.locateWithName('%s')" % app_name)

    def uninstall(self, name):
        self.marionette.switch_to_frame()
        self.marionette.execute_async_script("GaiaApps.uninstallWithName('%s')" % name)

    def kill(self, app):
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script("GaiaApps.kill('%s');" % app.origin)
        assert result, "Failed to kill app with name '%s'" % app.name

    def kill_all(self):
        self.marionette.switch_to_frame()
        self.marionette.execute_async_script("GaiaApps.killAll()")

    @property
    def installed_apps(self):
        apps = self.marionette.execute_async_script(
            'return GaiaApps.getInstalledApps();')
        result = []
        for app in [a for a in apps if not a['manifest'].get('role')]:
            entry_points = app['manifest'].get('entry_points')
            if entry_points:
                for ep in entry_points.values():
                    result.append(GaiaApp(
                        origin=app['origin'],
                        name=ep['name']))
            else:
                result.append(GaiaApp(
                    origin=app['origin'],
                    name=app['manifest']['name']))
        return result

    @property
    def running_apps(self):
        apps = self.marionette.execute_script(
            'return GaiaApps.getRunningApps();')
        result = []
        for app in [a[1] for a in apps.items()]:
            result.append(GaiaApp(origin=app['origin'], name=app['name']))
        return result


class GaiaData(object):

    def __init__(self, marionette, testvars=None):
        self.apps = GaiaApps(marionette)
        self.marionette = marionette
        self.testvars = testvars or {}
        js = os.path.abspath(os.path.join(__file__, os.path.pardir, 'atoms', "gaia_data_layer.js"))
        self.marionette.import_script(js)

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
        mozcontact = contact.create_mozcontact()
        result = self.marionette.execute_async_script('return GaiaDataLayer.insertContact(%s);' % json.dumps(mozcontact), special_powers=True)
        assert result, 'Unable to insert contact %s' % contact

    def remove_all_contacts(self):
        self.marionette.switch_to_frame()
        timeout = max(self.marionette.timeout or 60000, 1000 * len(self.all_contacts))
        result = self.marionette.execute_async_script('return GaiaDataLayer.removeAllContacts();', special_powers=True, script_timeout=timeout)
        assert result, 'Unable to remove all contacts'

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

    def _get_pref(self, datatype, name):
        self.marionette.switch_to_frame()
        pref = self.marionette.execute_script("return SpecialPowers.get%sPref('%s');" % (datatype, name), special_powers=True)
        self.apps.switch_to_displayed_app()
        return pref

    def _set_pref(self, datatype, name, value):
        value = json.dumps(value)
        self.marionette.switch_to_frame()
        self.marionette.execute_script("SpecialPowers.set%sPref('%s', %s);" % (datatype, name, value), special_powers=True)
        self.apps.switch_to_displayed_app()

    def get_bool_pref(self, name):
        """Returns the value of a Gecko boolean pref, which is different from a Gaia setting."""
        return self._get_pref('Bool', name)

    def set_bool_pref(self, name, value):
        """Sets the value of a Gecko boolean pref, which is different from a Gaia setting."""
        return self._set_pref('Bool', name, value)

    def get_int_pref(self, name):
        """Returns the value of a Gecko integer pref, which is different from a Gaia setting."""
        return self._get_pref('Int', name)

    def set_int_pref(self, name, value):
        """Sets the value of a Gecko integer pref, which is different from a Gaia setting."""
        return self._set_pref('Int', name, value)

    def get_char_pref(self, name):
        """Returns the value of a Gecko string pref, which is different from a Gaia setting."""
        return self._get_pref('Char', name)

    def set_char_pref(self, name, value):
        """Sets the value of a Gecko string pref, which is different from a Gaia setting."""
        return self._set_pref('Char', name, value)

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
        # XXX: check bug-926169
        # this is used to keep all tests passing while introducing multi-sim APIs
        return self.marionette.execute_script('var mobileConnection = window.navigator.mozMobileConnection || ' +
                                              'window.navigator.mozMobileConnections && ' +
                                              'window.navigator.mozMobileConnections[0]; ' +
                                              'return mobileConnection.data.connected;')

    def enable_cell_roaming(self):
        self.set_setting('ril.data.roaming_enabled', True)

    def disable_cell_roaming(self):
        self.set_setting('ril.data.roaming_enabled', False)

    @property
    def is_wifi_enabled(self):
        return self.marionette.execute_script("return window.navigator.mozWifiManager && "
                                              "window.navigator.mozWifiManager.enabled;")

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
        result = self.marionette.execute_async_script("return GaiaDataLayer.connectToWiFi(%s)" % json.dumps(network),
                script_timeout = max(self.marionette.timeout, 60000))
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
        known_networks = self.marionette.execute_async_script(
            'return GaiaDataLayer.getKnownNetworks()')
        return [n for n in known_networks if n]

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

    def get_all_sms(self):
        self.marionette.switch_to_frame()
        return self.marionette.execute_async_script("return GaiaDataLayer.getAllSms();", special_powers=True)

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

    def send_sms(self, number, message):
        import json
        number = json.dumps(number)
        message = json.dumps(message)
        result = self.marionette.execute_async_script('return GaiaDataLayer.sendSMS(%s, %s)' % (number, message), special_powers=True)
        assert result, 'Unable to send SMS to recipient %s with text %s' % (number, message)

    # FIXME: Bug 1011000: will make use of SoundManager instead
    def wait_for_audio_channel_changed(self):
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script("return GaiaDataLayer.waitForAudioChannelChanged();")
        assert result, "Failed to get a mozChromeEvent audio-channel-changed"
        return result

    # FIXME: Bug 1011000: will make use of SoundManager instead
    def wait_for_visible_audio_channel_changed(self):
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script("return GaiaDataLayer.waitForVisibleAudioChannelChanged();")
        assert result, "Failed to get a mozChromeEvent visible-audio-channel-changed"
        return result


class Accessibility(object):

    def __init__(self, marionette):
        self.marionette = marionette
        js = os.path.abspath(os.path.join(__file__, os.path.pardir,
                                          'atoms', "accessibility.js"))
        self.marionette.import_script(js)

    def is_hidden(self, element):
        return self.marionette.execute_async_script(
            'return Accessibility.isHidden.apply(Accessibility, arguments)',
            [element], special_powers=True)

    def is_disabled(self, element):
        return self.marionette.execute_async_script(
            'return Accessibility.isDisabled.apply(Accessibility, arguments)',
            [element], special_powers=True)

    def click(self, element):
        self.marionette.execute_async_script(
            'Accessibility.click.apply(Accessibility, arguments)',
            [element], special_powers=True)

    def get_name(self, element):
        return self.marionette.execute_async_script(
            'return Accessibility.getName.apply(Accessibility, arguments)',
            [element], special_powers=True)

    def get_role(self, element):
        return self.marionette.execute_async_script(
            'return Accessibility.getRole.apply(Accessibility, arguments)',
            [element], special_powers=True)

class FakeUpdateChecker(object):

    def __init__(self, marionette):
        self.marionette = marionette
        self.fakeupdatechecker_atom = os.path.abspath(
            os.path.join(__file__, os.path.pardir, 'atoms', "fake_update-checker.js"))

    def check_updates(self):
        self.marionette.set_context(self.marionette.CONTEXT_CHROME)
        self.marionette.import_script(self.fakeupdatechecker_atom)
        self.marionette.execute_script("GaiaUITests_FakeUpdateChecker();")
        self.marionette.set_context(self.marionette.CONTEXT_CONTENT)

class GaiaDevice(object):

    def __init__(self, marionette, testvars=None):
        self.marionette = marionette
        self.testvars = testvars or {}
        self.lockscreen_atom = os.path.abspath(
            os.path.join(__file__, os.path.pardir, 'atoms', "gaia_lock_screen.js"))

    def add_device_manager(self, device_manager):
        self._manager = device_manager

    @property
    def manager(self):
        if hasattr(self, '_manager') and self._manager:
            return self._manager

        if not self.is_android_build:
            raise Exception('Device manager is only available for devices.')

        else:
            raise Exception('GaiaDevice has no device manager object set.')

    @property
    def device_root(self):
        if not hasattr(self, '_device_root'):
            if self.manager.dirExists('/sdcard'):
                # it's a hamachi/inari or other single sdcard device
                self._device_root = '/sdcard/'
            elif self.manager.dirExists('/storage/sdcard0'):
                # it's a flame or dual-storage device. Default storage is sdcard0
                self._device_root = '/storage/sdcard0/'
            else:
                raise Exception('Could not find a storage location for the device')
        return self._device_root

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

        # Wait for the AppWindowManager to have registered the frame as active (loaded)
        locator = (By.CSS_SELECTOR, 'div.appWindow.active.render')
        Wait(marionette=self.marionette, timeout=timeout, ignored_exceptions=NoSuchElementException)\
            .until(lambda m: m.find_element(*locator).is_displayed())

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
        apps = GaiaApps(self.marionette)
        if apps.displayed_app.name.lower() != 'homescreen':
            # touching home button will return to homescreen
            self._dispatch_home_button_event()
            Wait(self.marionette).until(
                lambda m: apps.displayed_app.name.lower() == 'homescreen')
            apps.switch_to_displayed_app()
        else:
            apps.switch_to_displayed_app()
            mode = self.marionette.find_element(By.TAG_NAME, 'body').get_attribute('data-mode')
            self._dispatch_home_button_event()
            apps.switch_to_displayed_app()
            if mode == 'edit':
                # touching home button will exit edit mode
                Wait(self.marionette).until(lambda m: m.find_element(
                    By.TAG_NAME, 'body').get_attribute('data-mode') == 'normal')
            else:
                # touching home button will move to first page
                Wait(self.marionette).until(lambda m: m.execute_script(
                    'return window.wrappedJSObject.GridManager.pageHelper.getCurrentPageNumber();') == 0)

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
        return self.marionette.execute_script('return window.wrappedJSObject.System.locked')

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


class GaiaTestCase(MarionetteTestCase, B2GTestCaseMixin):
    def __init__(self, *args, **kwargs):
        self.restart = kwargs.pop('restart', False)
        MarionetteTestCase.__init__(self, *args, **kwargs)
        B2GTestCaseMixin.__init__(self, *args, **kwargs)

    def setUp(self):
        try:
            MarionetteTestCase.setUp(self)
        except InvalidResponseException:
            if self.restart:
                pass

        self.device = GaiaDevice(self.marionette, self.testvars)
        if self.device.is_android_build:
            self.device.add_device_manager(self.get_device_manager())
        if self.restart and (self.device.is_android_build or self.marionette.instance):
            # Restart if it's a device, or we have passed a binary instance with --binary command arg
            self.device.stop_b2g()
            if self.device.is_android_build:
                self.cleanup_data()
            self.device.start_b2g()

        # Run the fake update checker
        FakeUpdateChecker(self.marionette).check_updates()

        # We need to set the default timeouts because we may have a new session
        if self.marionette.timeout is None:
            # if no timeout is passed in, we detect the hardware type and set reasonable defaults
            timeouts = {}
            if self.device.is_desktop_b2g:
                self.marionette.timeout = 5000
                timeouts[self.marionette.TIMEOUT_SEARCH] = 5000
                timeouts[self.marionette.TIMEOUT_SCRIPT] = 10000
                timeouts[self.marionette.TIMEOUT_PAGE] = 10000
            elif self.device.is_emulator:
                self.marionette.timeout = 30000
                timeouts[self.marionette.TIMEOUT_SEARCH] = 30000
                timeouts[self.marionette.TIMEOUT_SCRIPT] = 60000
                timeouts[self.marionette.TIMEOUT_PAGE] = 60000
            else:
                # else, it is a device, the type of which is difficult to detect
                self.marionette.timeout = 10000
                timeouts[self.marionette.TIMEOUT_SEARCH] = 10000
                timeouts[self.marionette.TIMEOUT_SCRIPT] = 20000
                timeouts[self.marionette.TIMEOUT_PAGE] = 20000

            for k, v in timeouts.items():
                self.marionette.timeouts(k, v)

        else:
            # if the user has passed in --timeout then we override everything
            self.marionette.timeouts(self.marionette.TIMEOUT_SEARCH, self.marionette.timeout)
            self.marionette.timeouts(self.marionette.TIMEOUT_SCRIPT, self.marionette.timeout)
            self.marionette.timeouts(self.marionette.TIMEOUT_PAGE, self.marionette.timeout)

        self.apps = GaiaApps(self.marionette)
        self.data_layer = GaiaData(self.marionette, self.testvars)
        self.accessibility = Accessibility(self.marionette)

        if self.device.is_android_build:
            self.cleanup_sdcard()

        if self.restart:
            self.cleanup_gaia(full_reset=False)
        else:
            self.cleanup_gaia(full_reset=True)

    def cleanup_data(self):
        self.device.manager.removeDir('/cache/*')
        self.device.manager.removeDir('/data/b2g/mozilla')
        self.device.manager.removeDir('/data/local/debug_info_trigger')
        self.device.manager.removeDir('/data/local/indexedDB')
        self.device.manager.removeDir('/data/local/OfflineCache')
        self.device.manager.removeDir('/data/local/permissions.sqlite')
        self.device.manager.removeDir('/data/local/storage/persistent')
        # remove remembered networks
        self.device.manager.removeFile('/data/misc/wifi/wpa_supplicant.conf')

    def cleanup_sdcard(self):
        # cleanup files from the device_root
        for item in self.device.manager.listFiles(self.device.device_root):
            self.device.manager.removeDir('/'.join([self.device.device_root, item]))

    def cleanup_gaia(self, full_reset=True):
        # remove media
        if self.device.is_android_build:
            for filename in self.data_layer.media_files:
                self.device.manager.removeFile(filename)

        # restore settings from testvars
        [self.data_layer.set_setting(name, value) for name, value in self.testvars.get('settings', {}).items()]

        # restore prefs from testvars
        for name, value in self.testvars.get('prefs', {}).items():
            if type(value) is int:
                self.data_layer.set_int_pref(name, value)
            elif type(value) is bool:
                self.data_layer.set_bool_pref(name, value)
            else:
                self.data_layer.set_char_pref(name, value)

        # unlock
        self.device.unlock()

        # kill any open apps
        self.apps.kill_all()

        if full_reset:
            # disable passcode
            self.data_layer.set_setting('lockscreen.passcode-lock.code', '1111')
            self.data_layer.set_setting('lockscreen.passcode-lock.enabled', False)

            # change language back to english
            self.data_layer.set_setting("language.current", "en-US")

            # reset keyboard to default values
            self.data_layer.set_setting("keyboard.enabled-layouts",
                                        "{'app://keyboard.gaiamobile.org/manifest.webapp': {'en': True, 'number': True}}")

            # reset do not track
            self.data_layer.set_setting('privacy.donottrackheader.value', '-1')

            if self.data_layer.get_setting('airplaneMode.enabled'):
                # enable the device radio, disable airplane mode
                self.data_layer.set_setting('airplaneMode.enabled', False)

            # Re-set edge gestures pref to False
            self.data_layer.set_setting('edgesgesture.enabled', False)

            # disable carrier data connection
            if self.device.has_mobile_connection:
                self.data_layer.disable_cell_data()

            self.data_layer.disable_cell_roaming()

            if self.device.has_wifi:
                # Bug 908553 - B2G Emulator: support wifi emulation
                if not self.device.is_emulator:
                    self.data_layer.enable_wifi()
                    self.data_layer.forget_all_networks()
                    self.data_layer.disable_wifi()

            # remove data
            self.data_layer.remove_all_contacts()

            # reset to home screen
            self.device.touch_home_button()

        # disable sound completely
        self.data_layer.set_volume(0)

        # disable auto-correction of keyboard
        self.data_layer.set_setting('keyboard.autocorrect', False)

    def connect_to_network(self):
        if not self.device.is_online:
            try:
                self.connect_to_local_area_network()
            except:
                self.marionette.log('Failed to connect to wifi, trying cell data instead.')
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
        # push to the test storage space defined by device_root
        self.device.push_file(self.resource(filename), count, '/'.join([self.device.device_root, destination]))

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

    def tearDown(self):
        self.apps = None
        self.data_layer = None
        MarionetteTestCase.tearDown(self)


class GaiaEnduranceTestCase(GaiaTestCase, EnduranceTestCaseMixin, MemoryEnduranceTestCaseMixin):

    def __init__(self, *args, **kwargs):
        GaiaTestCase.__init__(self, *args, **kwargs)
        EnduranceTestCaseMixin.__init__(self, *args, **kwargs)
        MemoryEnduranceTestCaseMixin.__init__(self, *args, **kwargs)
        kwargs.pop('iterations', None)
        kwargs.pop('checkpoint_interval', None)

    def close_app(self):
        # Close the current app (self.app) by using the home button
        self.device.touch_home_button()

        # Bring up the cards view
        _cards_view_locator = ('id', 'cards-view')
        self.device.hold_home_button()
        self.wait_for_element_displayed(*_cards_view_locator)

        # Sleep a bit
        time.sleep(5)

        # Tap the close icon for the current app
        locator_part_two = '#cards-view li.card[data-origin*="%s"] .close-card' % self.app_under_test.lower()
        _close_button_locator = ('css selector', locator_part_two)
        close_card_app_button = self.marionette.find_element(*_close_button_locator)
        close_card_app_button.tap()
