# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import os
import shutil
import tempfile
import time

from marionette import MarionetteTestCase, EnduranceTestCaseMixin, \
    B2GTestCaseMixin, MemoryEnduranceTestCaseMixin
from marionette.by import By
from marionette import expected
from marionette.errors import NoSuchElementException
from marionette.errors import StaleElementException
from marionette.errors import InvalidResponseException
from marionette.wait import Wait

from file_manager import GaiaDeviceFileManager, GaiaLocalFileManager
from data_manager import GaiaDataManager
from gaia_device import GaiaDevice


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

    def uninstall(self, name):
        self.marionette.switch_to_frame()
        self.marionette.execute_async_script("GaiaApps.uninstallWithName('%s')" % name)

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

        # TODO: Once bug 1019043 is fixed we will be able to just use
        # self.device_manager instead of guarding for desktop B2G
        device_manager = None
        if not self.marionette.session_capabilities['device'] == 'desktop':
            device_manager = self.device_manager
        self.device = GaiaDevice(self.marionette,
                                 manager=device_manager,
                                 testvars=self.testvars)

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
        self.data_layer = GaiaDataManager(self.marionette, self.testvars)
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
        self.device.file_manager.remove('/data/local/storage/persistent')
        # remove remembered networks
        self.device.file_manager.remove('/data/misc/wifi/wpa_supplicant.conf')

    def cleanup_storage(self):
        """Remove all files from the device's storage paths"""
        storage_paths = [self.device.storage_path]
        if self.device.is_android_build:
            # TODO: Remove hard-coded paths once bug 1018079 is resolved
            storage_paths.extend(['/mnt/sdcard',
                                  '/mnt/extsdcard',
                                  '/storage/sdcard0',
                                  '/storage/sdcard1'])
        for path in storage_paths:
            if self.device.file_manager.dir_exists(path):
                for item in self.device.file_manager.list_items(path):
                    self.device.file_manager.remove('/'.join([path, item]))

    def cleanup_gaia(self, full_reset=True):
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
        if self.data_layer.get_setting('lockscreen.enabled'):
            self.device.unlock()

        # kill the FTU and any open, user-killable apps
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

    def push_resource(self, filename, remote_path=None, count=1):
        # push to the test storage space defined by device root
        self.device.file_manager.push_file(
            self.resource(filename), remote_path, count)

    def resource(self, filename):
        return os.path.abspath(os.path.join(os.path.dirname(__file__), 'resources', filename))

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
