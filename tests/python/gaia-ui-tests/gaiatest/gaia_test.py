# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import os
import posixpath
import shutil
import tempfile
import time

from marionette import MarionetteTestCase, B2GTestCaseMixin
from marionette_driver import expected, By, Wait
from marionette_driver.errors import NoSuchElementException, StaleElementException
import mozfile

from environment import GaiaTestEnvironment
from file_manager import GaiaDeviceFileManager, GaiaLocalFileManager

DEFAULT_SETTINGS = {
    'airplaneMode.enabled': False,  # disable airplane mode
    'audio.volume.alarm': 0,  # mute alarm audio
    'audio.volume.content': 0,  # mute content audio
    'audio.volume.notification': 0,  # mute audio notifications
    'camera.sound.enabled': False,  # mute camera sounds
    'edgesgesture.enabled': False,  # disable edge gestures
    'ftu.manifestURL': None,  # disable the first time usage app
    'keyboard.autocorrect': False,  # disable auto-correction of keyboard
    'keyboard.clicksound': False,  # mute keyboard click sound
    'keyboard.enabled-layouts': str({
        'app://keyboard.gaiamobile.org/manifest.webapp': {
            'en': True, 'number': True}}),  # reset keyboard layouts
    'keyboard.vibration': False,  # disable keyboard vibration
    'language.current': 'en-US',  # reset language to en-US
    'lockscreen.enabled': False,  # disable lockscreen
    'lockscreen.passcode-lock.code': '1111',
    'lockscreen.passcode-lock.enabled': False,  # disable lockscreen passcode
    'lockscreen.unlock-sound.enabled': False,  # mute unlock sound
    'message.sent-sound.enabled': False,  # mute message sent sound
    'phone.ring.keypad': False,  # mute dial pad sounds
    'privacy.donottrackheader.value': -1,  # reset do not track
    'ril.data.roaming_enabled': False,  # disable roaming
    'search.suggestions.enabled': False,  # disable search suggestions
    'screen.brightness': 0.1,  # reduce screen brightness
    'screen.timeout': 0,  # disable screen timeout
    'vibration.enabled': False,  # disable vibration
}


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
        self.marionette.switch_to_frame()
        return self.marionette.execute_async_script("return GaiaApps.getPermission('%s', '%s')" % (app_name, permission_name))

    def set_permission(self, app_name, permission_name, value):
        self.marionette.switch_to_frame()
        return self.marionette.execute_async_script("return GaiaApps.setPermission('%s', '%s', '%s')" %
                                                    (app_name, permission_name, value))

    def set_permission_by_url(self, manifest_url, permission_name, value):
        self.marionette.switch_to_frame()
        return self.marionette.execute_async_script("return GaiaApps.setPermissionByUrl('%s', '%s', '%s')" %
                                                    (manifest_url, permission_name, value))

    def launch(self, name, manifest_url=None, entry_point=None, switch_to_frame=True, launch_timeout=None):
        self.marionette.switch_to_frame()

        if manifest_url:
            result = self.marionette.execute_async_script("GaiaApps.launchWithManifestURL('%s', %s)"
                                                          % (manifest_url, json.dumps(entry_point)), script_timeout=launch_timeout)
            assert result, "Failed to launch app with manifest_url '%s'" % manifest_url
        else:
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
        result = self.marionette.execute_script('return GaiaApps.getDisplayedApp();')
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

    def kill(self, app):
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script("GaiaApps.kill('%s');" % app.origin)
        assert result, "Failed to kill app with name '%s'" % app.name

    def kill_all(self):
        # First we attempt to kill the FTU, we treat it as a user app
        for app in self.running_apps(include_system_apps=True):
            if app.origin == 'app://ftu.gaiamobile.org':
                self.kill(app)
                break

        # Now kill the user apps
        self.marionette.switch_to_frame()
        self.marionette.execute_async_script("GaiaApps.killAll();")

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

    def running_apps(self, include_system_apps=False):
        '''  Returns a list of running apps
        Args:
            include_system_apps: Includes otherwise hidden System apps in the list
        Returns:
            A list of GaiaApp objects representing the running apps.
        '''
        include_system_apps = json.dumps(include_system_apps)
        self.marionette.switch_to_frame()
        apps = self.marionette.execute_script(
            "return GaiaApps.getRunningApps(%s);" % include_system_apps)
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

        # TODO Bugs 1043562/1049489 To perform ContactsAPI scripts from the chrome context, we need
        # to import the js file into chrome context too
        self.marionette.set_context(self.marionette.CONTEXT_CHROME)
        self.marionette.import_script(js)
        self.marionette.set_context(self.marionette.CONTEXT_CONTENT)

    def set_time(self, date_number):
        self.marionette.set_context(self.marionette.CONTEXT_CHROME)
        self.marionette.execute_script("window.navigator.mozTime.set(%s);" % date_number)
        self.marionette.set_context(self.marionette.CONTEXT_CONTENT)

    @property
    def all_contacts(self):
        # TODO Bug 1049489 - In future, simplify executing scripts from the chrome context
        self.marionette.set_context(self.marionette.CONTEXT_CHROME)
        result = self.marionette.execute_async_script('return GaiaDataLayer.getAllContacts();', special_powers=True)
        self.marionette.set_context(self.marionette.CONTEXT_CONTENT)
        return result

    @property
    def sim_contacts(self):
        self.marionette.switch_to_frame()
        adn_contacts = self.marionette.execute_async_script('return GaiaDataLayer.getSIMContacts("adn");', special_powers=True)
        sdn_contacts = self.marionette.execute_async_script('return GaiaDataLayer.getSIMContacts("sdn");', special_powers=True)
        return adn_contacts + sdn_contacts

    def insert_contact(self, contact):
        # TODO Bug 1049489 - In future, simplify executing scripts from the chrome context
        self.marionette.set_context(self.marionette.CONTEXT_CHROME)
        mozcontact = contact.create_mozcontact()
        result = self.marionette.execute_async_script('return GaiaDataLayer.insertContact(%s);' % json.dumps(mozcontact), special_powers=True)
        assert result, 'Unable to insert contact %s' % contact
        self.marionette.set_context(self.marionette.CONTEXT_CONTENT)

    def insert_sim_contact(self, contact, contact_type='adn'):
        mozcontact = contact.create_mozcontact()
        result = self.marionette.execute_async_script('return GaiaDataLayer.insertSIMContact("%s", %s);'
                                                      % (contact_type, json.dumps(mozcontact)), special_powers=True)
        assert result, 'Unable to insert SIM contact %s' % contact
        return result

    def delete_sim_contact(self, moz_contact_id, contact_type='adn'):
        result = self.marionette.execute_async_script('return GaiaDataLayer.deleteSIMContact("%s", "%s");'
                                                      % (contact_type, moz_contact_id), special_powers=True)
        assert result, 'Unable to insert SIM contact %s' % moz_contact_id

    def remove_all_contacts(self):
        # TODO Bug 1049489 - In future, simplify executing scripts from the chrome context
        self.marionette.set_context(self.marionette.CONTEXT_CHROME)
        timeout = max(self.marionette.timeout or 60000, 1000 * len(self.all_contacts))
        result = self.marionette.execute_async_script('return GaiaDataLayer.removeAllContacts();', special_powers=True, script_timeout=timeout)
        assert result, 'Unable to remove all contacts'
        self.marionette.set_context(self.marionette.CONTEXT_CONTENT)

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
        return pref

    def _set_pref(self, datatype, name, value):
        value = json.dumps(value)
        self.marionette.switch_to_frame()
        self.marionette.execute_script("SpecialPowers.set%sPref('%s', %s);" % (datatype, name, value), special_powers=True)

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
    def bluetooth_is_discoverable(self):
        self.marionette.switch_to_frame()
        return self.marionette.execute_script("return window.wrappedJSObject.Bluetooth.defaultAdapter.discoverable")

    @property
    def bluetooth_name(self):
        self.marionette.switch_to_frame()
        return self.marionette.execute_script("return window.wrappedJSObject.Bluetooth.defaultAdapter.name")

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
        return self.marionette.execute_script('return window.navigator.mozMobileConnections && ' +
                                              'window.navigator.mozMobileConnections[0].data.connected;')

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
                                                      script_timeout=max(self.marionette.timeout, 60000))
        assert result, 'Unable to connect to WiFi network'

    def forget_all_networks(self):
        self.marionette.switch_to_frame()
        self.marionette.execute_async_script('return GaiaDataLayer.forgetAllNetworks()')

    def is_wifi_connected(self, network=None):
        network = network or self.testvars.get('wifi')
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

    def insert_call_entry(self, call):
        """The call log needs to be open and focused in order for this to work."""
        self.marionette.execute_script('window.wrappedJSObject.CallLogDBManager.add(%s);' % (json.dumps(call)))

        # TODO Replace with proper wait when possible
        import time
        time.sleep(1)

    def kill_active_call(self):
        self.marionette.execute_script("var telephony = window.navigator.mozTelephony; " +
                                       "if(telephony.active) telephony.active.hangUp();")

    def kill_conference_call(self):
        self.marionette.execute_script("""
        var callsToEnd = window.navigator.mozTelephony.conferenceGroup.calls;
        for (var i = (callsToEnd.length - 1); i >= 0; i--) {
            var call = callsToEnd[i];
            call.hangUp();
        }
        """)

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
            return [file for file in files if file['name'].endswith(extension)]
        return files

    def send_sms(self, number, message):
        self.marionette.switch_to_frame()
        import json
        number = json.dumps(number)
        message = json.dumps(message)
        result = self.marionette.execute_async_script('return GaiaDataLayer.sendSMS(%s, %s)' % (number, message), special_powers=True)
        assert result, 'Unable to send SMS to recipient %s with text %s' % (number, message)

    def add_notification(self, title, options=None):
        self.marionette.execute_script('new Notification("%s", %s);' % (title, json.dumps(options)))

    def clear_notifications(self):
        self.marionette.execute_script('window.wrappedJSObject.NotificationScreen.clearAll();')

    @property
    def current_audio_channel(self):
        self.marionette.switch_to_frame()
        return self.marionette.execute_script("return window.wrappedJSObject.soundManager.currentChannel;")


class Accessibility(object):

    def __init__(self, marionette):
        self.marionette = marionette
        js = os.path.abspath(os.path.join(__file__, os.path.pardir,
                                          'atoms', "accessibility.js"))
        self.marionette.import_script(js)

    def is_hidden(self, element):
        return self._run_async_script('isHidden', [element])

    def is_visible(self, element):
        return self._run_async_script('isVisible', [element])

    def is_disabled(self, element):
        return self._run_async_script('isDisabled', [element])

    def click(self, element):
        self._run_async_script('click', [element])

    def wheel(self, element, direction):
        self.marionette.execute_script('Accessibility.wheel.apply(Accessibility, arguments)', [
            element, direction])

    def get_name(self, element):
        return self._run_async_script('getName', [element])

    def get_role(self, element):
        return self._run_async_script('getRole', [element])

    def dispatchEvent(self):
        self.marionette.switch_to_frame()
        self.marionette.execute_script(
            "window.wrappedJSObject.dispatchEvent(new CustomEvent('accessibility-action'));")

    def _run_async_script(self, func, args):
        result = self.marionette.execute_async_script(
            'return Accessibility.%s.apply(Accessibility, arguments)' % func,
            args, special_powers=True)

        if not result:
            return

        if result.has_key('error'):
            message = 'accessibility.js error: %s' % result['error']
            raise Exception(message)

        return result.get('result', None)


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
            GaiaData(self.marionette).set_char_pref(
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
        return self.marionette.execute_script('return window.navigator.mozMobileConnections && ' +
                                              'window.navigator.mozMobileConnections[0].voice.network !== null')

    @property
    def has_wifi(self):
        if not hasattr(self, '_has_wifi'):
            self._has_wifi = self.marionette.execute_script('return window.navigator.mozWifiManager !== undefined')
        return self._has_wifi

    def restart_b2g(self):
        self.stop_b2g()
        time.sleep(2)
        self.start_b2g()

    def start_b2g(self, timeout=120):
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

    def wait_for_b2g_ready(self, timeout=120):
        # Wait for the homescreen to finish loading
        Wait(self.marionette, timeout).until(expected.element_present(
            By.CSS_SELECTOR, '#homescreen[loading-state=false]'))

        # Wait for logo to be hidden
        self.marionette.set_search_timeout(0)
        try:
            Wait(self.marionette, timeout, ignored_exceptions=StaleElementException).until(
                lambda m: not m.find_element(By.ID, 'os-logo').is_displayed())
        except NoSuchElementException:
            pass
        self.marionette.set_search_timeout(self.marionette.timeout or 10000)

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
            window.wrappedJSObject.dispatchEvent(new KeyboardEvent('mozbrowserbeforekeydown', {
              key: 'Power'
            }));""")

    def press_release_volume_up_then_down_n_times(self, n_times):
        self.marionette.execute_script("""
            function sendEvent(key, aType) {
              var type = aType === 'press' ? 'mozbrowserafterkeydown' : 'mozbrowserafterkeyup';
              window.wrappedJSObject.dispatchEvent(new KeyboardEvent(type, {
                key: key
              }));
            }
            for (var i = 0; i < arguments[0]; ++i) {
              sendEvent('VolumeUp', 'press');
              sendEvent('VolumeUp', 'release');
              sendEvent('VolumeDown', 'press');
              sendEvent('VolumeDown', 'release');
            };""", script_args=[n_times])

    def turn_screen_off(self):
        apps = GaiaApps(self.marionette)
        self.marionette.switch_to_frame()
        ret = self.marionette.execute_script("window.wrappedJSObject.ScreenManager.turnScreenOff(true)")
        apps.switch_to_displayed_app()
        return ret

    def turn_screen_on(self):
        apps = GaiaApps(self.marionette)
        self.marionette.switch_to_frame()
        ret = self.marionette.execute_script("window.wrappedJSObject.ScreenManager.turnScreenOn(true)")
        apps.switch_to_displayed_app()
        return ret

    @property
    def is_screen_enabled(self):
        apps = GaiaApps(self.marionette)
        self.marionette.switch_to_frame()
        ret = self.marionette.execute_script('return window.wrappedJSObject.ScreenManager.screenEnabled')
        apps.switch_to_displayed_app()
        return ret

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
            mode = self.marionette.find_element(By.TAG_NAME, 'body').get_attribute('class')
            self._dispatch_home_button_event()
            apps.switch_to_displayed_app()
            if 'edit-mode' in mode:
                # touching home button will exit edit mode
                Wait(self.marionette).until(lambda m: m.find_element(
                    By.TAG_NAME, 'body').get_attribute('class') != mode)
            else:
                # touching home button inside homescreen will scroll it to the top
                Wait(self.marionette).until(lambda m: m.execute_script(
                    "return window.wrappedJSObject.scrollY") == 0)

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
        return self.marionette.execute_script('return window.wrappedJSObject.Service.locked')

    def lock(self):
        GaiaData(self.marionette).set_setting('lockscreen.enabled', True)
        self.turn_screen_off()
        self.turn_screen_on()
        assert self.is_locked, 'The screen is not locked'
        Wait(self.marionette).until(lambda m: m.find_element(By.CSS_SELECTOR, 'div.lockScreenWindow.active'))

    def unlock(self):
        self.marionette.import_script(self.lockscreen_atom)
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script('GaiaLockScreen.unlock()')
        GaiaData(self.marionette).set_setting('lockscreen.enabled', False)
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


class GaiaTestCase(MarionetteTestCase, B2GTestCaseMixin):
    def __init__(self, *args, **kwargs):
        self.restart = kwargs.pop('restart', False)
        MarionetteTestCase.__init__(self, *args, **kwargs)
        B2GTestCaseMixin.__init__(self, *args, **kwargs)

    def setUp(self):
        try:
            MarionetteTestCase.setUp(self)
        except IOError:
            if self.restart:
                pass

        self.environment = GaiaTestEnvironment(self.testvars)
        self.device = GaiaDevice(self.marionette,
                                 manager=self.device_manager,
                                 testvars=self.testvars)

        if self.restart and (self.device.is_android_build or self.marionette.instance):
            # Restart if it's a device, or we have passed a binary instance with --binary command arg
            self.device.stop_b2g()
            try:
                if self.device.is_android_build:
                    self.cleanup_data()
                self.set_defaults()
            finally:
                # make sure we restart to avoid leaving us in a bad state
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

        self.cleanup_storage()

        if self.restart:
            self.cleanup_gaia(full_reset=False)
        else:
            self.cleanup_gaia(full_reset=True)

    def cleanup_data(self):
        self.device.file_manager.remove('/cache/*')
        self.device.file_manager.remove('/data/b2g/mozilla')
        self.device.file_manager.remove('/data/local/debug_info_trigger')
        self.device.file_manager.remove('/data/local/indexedDB')
        self.device.file_manager.remove('/data/local/OfflineCache')
        self.device.file_manager.remove('/data/local/permissions.sqlite')
        self.device.file_manager.remove('/data/local/storage/permanent')
        self.device.file_manager.remove('/data/local/storage/persistent')
        self.device.file_manager.remove('/data/local/storage/default')
        self.device.file_manager.remove('/data/local/webapps')
        # remove remembered networks
        self.device.file_manager.remove('/data/misc/wifi/wpa_supplicant.conf')

    def cleanup_storage(self):
        """Remove all files from the device's storage paths"""
        storage_paths = [self.device.storage_path]
        if self.device.is_android_build:
            # TODO: Remove hard-coded paths once bug 1018079 is resolved
            storage_paths.extend(['/mnt/sdcard',
                                  '/mnt/extsdcard',
                                  '/storage/sdcard',
                                  '/storage/sdcard0',
                                  '/storage/sdcard1'])
        for path in storage_paths:
            if self.device.file_manager.dir_exists(path):
                for item in self.device.file_manager.list_items(path):
                    self.device.file_manager.remove('/'.join([path, item]))

    def cleanup_gaia(self, full_reset=True):
        # kill the FTU and any open, user-killable apps
        self.apps.kill_all()

        # Per bug 1156445, ensure the screen is on prior to running the test.
        # When the bootup takes long time, the screen times out when homescreen is opened.
        self.device.turn_screen_off()
        self.device.turn_screen_on()

        # unlock
        if self.data_layer.get_setting('lockscreen.enabled'):
            self.device.unlock()

        if full_reset:
            defaults = DEFAULT_SETTINGS.copy()
            defaults.update(self.testvars.get('settings', {}))
            defaults = self.modify_settings(defaults)
            for name, value in defaults.items():
                self.data_layer.set_setting(name, value)

            # disable carrier data connection
            if self.device.has_mobile_connection:
                self.data_layer.disable_cell_data()

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

        # restore prefs from testvars
        for name, value in self.testvars.get('prefs', {}).items():
            if type(value) is int:
                self.data_layer.set_int_pref(name, value)
            elif type(value) is bool:
                self.data_layer.set_bool_pref(name, value)
            else:
                self.data_layer.set_char_pref(name, value)

    def connect_to_local_area_network(self):
        if not self.device.is_online:
            if self.testvars.get('wifi') and self.device.has_wifi:
                self.data_layer.connect_to_wifi()
                assert self.device.is_online
            else:
                raise Exception('Unable to connect to local area network')

    def disable_all_network_connections(self):
        if self.device.has_wifi:
            self.data_layer.enable_wifi()
            self.data_layer.forget_all_networks()
            self.data_layer.disable_wifi()

        if self.device.has_mobile_connection:
            self.data_layer.disable_cell_data()

    def push_resource(self, filename, remote_path=None, count=1):
        # push to the test storage space defined by device root
        self.device.file_manager.push_file(
            self.resource(filename), remote_path, count)

    def resource(self, filename):
        return os.path.abspath(os.path.join(os.path.dirname(__file__), 'resources', filename))

    def modify_settings(self, settings):
        """Hook to modify the default settings before they're applied.

        :param settings: dictionary of the settings that would be applied.
        :returns: modified dictionary of the settings to be applied.

        This method provides tha ability for test cases to override the default
        settings before they're applied. To use it, define the method in your
        test class and return a modified dictionary of settings:

        .. code-block:: python

            class TestModifySettings(GaiaTestCase):

                def modify_settings(self, settings):
                    settings['foo'] = 'bar'
                    return settings

                def test_modify_settings(self):
                    self.assertEqual('bar', self.data_layer.get_setting('foo'))

        """
        return settings

    def set_defaults(self):
        filename = 'settings.json'
        defaults = DEFAULT_SETTINGS.copy()
        defaults.update(self.testvars.get('settings', {}))
        defaults = self.modify_settings(defaults)

        if self.device.is_desktop_b2g:
            directory = self.marionette.instance.profile_path
            path = os.path.join(directory, filename)
        else:
            directory = '/system/b2g/defaults'
            path = posixpath.join(directory, filename)

        settings = json.loads(self.device.file_manager.pull_file(path))
        for name, value in defaults.items():
            self.logger.debug('Setting %s to %s' % (name, value))
            settings[name] = value
        td = tempfile.mkdtemp()
        try:
            tf = os.path.join(td, filename)
            with open(tf, 'w') as f:
                json.dump(settings, f)
            if not self.device.is_desktop_b2g:
                self.device.manager.remount()
            self.device.file_manager.push_file(tf, directory)
        finally:
            mozfile.remove(td)

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
        if self.device.is_desktop_b2g and self.device.storage_path:
            shutil.rmtree(self.device.storage_path, ignore_errors=True)
        self.apps = None
        self.data_layer = None
        MarionetteTestCase.tearDown(self)
