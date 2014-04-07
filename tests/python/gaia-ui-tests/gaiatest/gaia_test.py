# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import os
import time

from marionette import MarionetteTestCase, EnduranceTestCaseMixin, B2GTestCaseMixin, \
                       MemoryEnduranceTestCaseMixin
from marionette.by import By
from marionette.errors import NoSuchElementException
from marionette.errors import ElementNotVisibleException
from marionette.errors import TimeoutException
from marionette.errors import StaleElementException
from marionette.errors import InvalidResponseException
import mozdevice
from yoctopuce.yocto_api import YAPI, YRefParam, YModule
from yoctopuce.yocto_current import YCurrent
from yoctopuce.yocto_datalogger import YDataLogger


class LockScreen(object):

    def __init__(self, marionette):
        self.marionette = marionette
        js = os.path.abspath(os.path.join(__file__, os.path.pardir, 'atoms', "gaia_lock_screen.js"))
        self.marionette.import_script(js)

    @property
    def is_locked(self):
        self.marionette.switch_to_frame()
        return self.marionette.execute_script('return window.wrappedJSObject.LockScreen.locked')

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
        js = os.path.abspath(os.path.join(__file__, os.path.pardir, 'atoms', "gaia_apps.js"))
        self.marionette.import_script(js)
        result = self.marionette.execute_async_script("GaiaApps.kill('%s');" % app.origin)
        assert result, "Failed to kill app with name '%s'" % app.name

    def kill_all(self):
        self.marionette.switch_to_frame()
        js = os.path.abspath(os.path.join(__file__, os.path.pardir, 'atoms', "gaia_apps.js"))
        self.marionette.import_script(js)
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

    def switch_to_frame(self, app_frame, url=None, timeout=None):
        timeout = timeout or (self.marionette.timeout and self.marionette.timeout / 1000) or 30
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
        result = self.marionette.execute_async_script('return GaiaDataLayer.insertContact(%s);' % json.dumps(contact), special_powers=True)
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


class PowerDataRun(object):

    def __init__(self):
        self._samples = []

    @classmethod
    def from_json(self, json_str):
        pds = json.loads(json_str)
        samples = []
        for pd in pds:
            samples.append( PowerData( **pd ) )
        return cls(samples)

    def plot(self, filename):
        """ \o/ yay! gnuplot for the win! """
        pass

    def add_sample(self, sample):
        self._samples.append(sample)

    def clear(self):
        del self._samples[:]

    def to_json(self):
        data = []
        for d in self._samples:
            data.append(d.data())
        return json.dumps(data)


class PowerData(object):

    def __init__(self, start_time=None, amps=None, volts=None):
        self._start_time = start_time
        self._amps = amps
        self._volts = volts

    @classmethod
    def from_yocto_sensors(cls, ammeter, volts):
        """ gathers the recorded data from the ammeter """
        data = ammeter.data
        columns = [u't']
        columns.extend(data.get_columnNames())

        start = data.get_startTimeUTC()
        period = data.get_dataSamplesInterval()
        num_samples = data.get_rowCount()

        # add the timestamp to each row
        samples = []
        rows = data.get_dataRows()
        for i in xrange(0, num_samples):
            row = [ start + i * period ]
            row.extend(rows[i])
            samples.append( row )

        amps = { "columns": columns, "samples": samples, "events": ammeter.events }

        return cls( start, amps, volts )

    @classmethod
    def from_json(cls, json_str):
        """ XXX FIXME: we need to validate that the decoded
        data is sane and has what we're looking for """
        pd = json.loads(json_str)
        return cls( **pd )

    def data(self):
        return {"start_time":self._start_time,
                "amps":self._amps,
                "volts":self._volts}

    def to_json(self):
        """output format looks like this:
        {
            "start_time":"<utc start time>",
            "amps":
            {
                "columns":["t", "col1","col2","col3"],
                "samples":
                [
                    [<utc stamp>,1,2,3],
                    [<utc stamp>,1,2,3],
                    .
                    .
                    .
                ],
                "events":
                [
                    [<utc stamp>,"blah happened"],
                    [<utc stamp>,"blah again!"],
                    .
                    .
                    .
                ]
            },
            "volts": <voltage in micro-amps>
        }"""
        return json.dumps(self.data())

class YoctoDevice(object):

    def __init__(self):
        pass

    @property
    def module(self):
        if hasattr(self, '_module') and self._module:
            return self._module

        # need to verify that the yocto device is attached
        errmsg = YRefParam()
        if YAPI.RegisterHub("usb", errmsg) != YAPI.SUCCESS:
            raise Exception('could not register yocto usb connection')
        sensor = YCurrent.FirstCurrent()
        if sensor is None:
            raise Exception('could not find yocto ammeter device')
        if sensor.isOnline():
            self._module = sensor.get_module()
        return self._module

    @property
    def beacon(self):
        return self._module.get_beacon()

    @beacon.setter
    def beacon(self, value):
        if value:
            self._module.set_beacon(YModule.BEACON_ON)
        else:
            self._module.set_beacon(YModule.BEACON_OFF)


class YoctoAmmeter(YoctoDevice):

    def __init__(self):
        self._data = None
        # make sure the data logger is off
        self.recording = False
        super(YoctoAmmeter, self).__init__()

    @property
    def sensor(self):
        if hasattr(self, '_sensor') and self._sensor:
            return self._sensor

        # get a handle to the ammeter sensor
        self._sensor = YCurrent.FindCurrent(self.module.get_serialNumber() + '.current1')
        if not self.module.isOnline() or self._sensor is None:
            raise Exception('could not get sensor device')
        return self._sensor

    @property
    def data_logger(self):
        if hasattr(self, '_data_logger') and self._data_logger:
            return self._data_logger

        # get a handle to the data logger
        self._data_logger = YDataLogger.FindDataLogger(self.module.get_serialNumber() + '.dataLogger')
        if not self.module.isOnline() or self._data_logger is None:
            raise Exception('could not get data logger device')

        # fix up the data logger's internal clock
        self._data_logger.set_timeUTC(time.mktime(time.gmtime()))

        return self._data_logger

    @property
    def recording(self):
        return (self.data_logger.get_recording() == YDataLogger.RECORDING_ON)

    @recording.setter
    def recording(self, value):
        if value:
            if self.recording:
                raise Exception('data logger already recording')

            # erase the data logger memory
            if self.data_logger.forgetAllDataStreams() != YAPI.SUCCESS:
                raise Exception('failed to clear yocto data logger memory')

            # go!
            if self.data_logger.set_recording(YDataLogger.RECORDING_ON) != YAPI.SUCCESS:
                raise Exception('failed to start yocto data logger')

            # delete all data that may be cached
            del self._data
            self._data = None

            # turn on the beacon
            self.beacon = True

        else:
            # are we currently recording?
            was_recording = self.recording

            # stop!
            if self.data_logger.set_recording(YDataLogger.RECORDING_OFF) != YAPI.SUCCESS:
                raise Exception('failed to stop yocto data logger')

            if was_recording:
                # get the first data stream
                streamsRef = YRefParam()
                self.data_logger.get_dataStreams(streamsRef)
                self._data = streamsRef.value[0]

            # turn off the beacon
            self.beacon = False

    @property
    def events(self):
        if not hasattr(self, '_events'):
            self._events = []
        return self._events

    @property
    def data(self):
        if not hasattr(self, '_data'):
            self._data = None
        return self._data

    def mark_event(self, desc=""):
        """used to store a timestamp and description for later correlation
        with the power draw data"""
        if not self.recording:
            raise Exception('yocto device is not logging data')
        self.events.append([self.data_logger.get_timeUTC(), desc])


class GaiaDevice(object):

    def __init__(self, marionette, testvars=None):
        self.marionette = marionette
        self.testvars = testvars or {}

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
    def is_android_build(self):
        if self.testvars.get('is_android_build') is None:
            self.testvars['is_android_build'] = 'Android' in self.marionette.session_capabilities['platform']
        return self.testvars['is_android_build']

    @property
    def is_emulator(self):
        if not hasattr(self, '_is_emulator'):
            self._is_emulator = self.marionette.session_capabilities['device'] == 'qemu'
        return self._is_emulator

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

    @property
    def voltage_now(self):
        return self.manager.shellCheckOutput(["cat", "/sys/class/power_supply/battery/voltage_now"])

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


class GaiaTestCase(MarionetteTestCase, B2GTestCaseMixin):
    def __init__(self, *args, **kwargs):
        self.restart = kwargs.pop('restart', False)
        self.yocto = kwargs.pop('yocto', False)
        kwargs.pop('iterations', None)
        kwargs.pop('checkpoint_interval', None)
        MarionetteTestCase.__init__(self, *args, **kwargs)
        B2GTestCaseMixin.__init__(self, *args, **kwargs)

    def setUp(self):
        try:
            MarionetteTestCase.setUp(self)
        except InvalidResponseException:
            if self.restart:
                pass

        if self.yocto:
            """ with the yocto ammeter we only get amp measurements
            so we also need to use the linux kernel voltage device to
            sample the voltage at the start of each test so we can
            calculate watts."""
            try:
                self.ammeter = YoctoAmmeter()
            except:
                self.ammeter = None

        self.device = GaiaDevice(self.marionette, self.testvars)
        if self.device.is_android_build:
            self.device.add_device_manager(self.device_manager)
        if self.restart and (self.device.is_android_build or self.marionette.instance):
            self.device.stop_b2g()
            if self.device.is_android_build:
                self.cleanup_data()
            self.device.start_b2g()

        # we need to set the default timeouts because we may have a new session
        if self.marionette.timeout is not None:
            self.marionette.timeouts(self.marionette.TIMEOUT_SEARCH, self.marionette.timeout)
            self.marionette.timeouts(self.marionette.TIMEOUT_SCRIPT, self.marionette.timeout)
            self.marionette.timeouts(self.marionette.TIMEOUT_PAGE, self.marionette.timeout)
        else:
            self.marionette.timeouts(self.marionette.TIMEOUT_SEARCH, 10000)
            self.marionette.timeouts(self.marionette.TIMEOUT_PAGE, 30000)

        self.lockscreen = LockScreen(self.marionette)
        self.apps = GaiaApps(self.marionette)
        self.data_layer = GaiaData(self.marionette, self.testvars)
        from gaiatest.apps.keyboard.app import Keyboard
        self.keyboard = Keyboard(self.marionette)

        if self.device.is_android_build:
            self.cleanup_sdcard()

        if self.restart:
            self.cleanup_gaia(full_reset=False)
        else:
            self.cleanup_gaia(full_reset=True)

    def cleanup_data(self):
        self.device.manager.removeDir('/data/local/storage/persistent')
        self.device.manager.removeDir('/data/b2g/mozilla')

    def cleanup_sdcard(self):
        for item in self.device.manager.listFiles('/sdcard/'):
            self.device.manager.removeDir('/'.join(['/sdcard', item]))

    def cleanup_gaia(self, full_reset=True):
        # remove media
        if self.device.is_android_build:
            for filename in self.data_layer.media_files:
                self.device.manager.removeFile(filename)

        # switch off keyboard FTU screen
        self.data_layer.set_setting("keyboard.ftu.enabled", False)

        # restore settings from testvars
        [self.data_layer.set_setting(name, value) for name, value in self.testvars.get('settings', {}).items()]

        # unlock
        self.lockscreen.unlock()

        if full_reset:
            # disable passcode
            self.data_layer.set_setting('lockscreen.passcode-lock.code', '1111')
            self.data_layer.set_setting('lockscreen.passcode-lock.enabled', False)

            # change language back to english
            self.data_layer.set_setting("language.current", "en-US")

            # switch off spanish keyboard
            self.data_layer.set_setting("keyboard.layouts.spanish", False)

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
            self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home'));")

        # kill any open apps
        self.apps.kill_all()

        # disable sound completely
        self.data_layer.set_volume(0)

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
                'Element %s not present before timeout' % locator)

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
            except (NoSuchElementException, StaleElementException) as e:
                pass
        else:
            # This is an effortless way to give extra debugging information
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

    def wait_for_condition(self, method, timeout=None,
                           message="Condition timed out"):
        """Calls the method provided with the driver as an argument until the \
        return value is not False."""
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


class GaiaEnduranceTestCase(GaiaTestCase, EnduranceTestCaseMixin, MemoryEnduranceTestCaseMixin):

    def __init__(self, *args, **kwargs):
        GaiaTestCase.__init__(self, *args, **kwargs)
        EnduranceTestCaseMixin.__init__(self, *args, **kwargs)
        MemoryEnduranceTestCaseMixin.__init__(self, *args, **kwargs)
        self.add_drive_setup_function(self.yocto_drive_setup)
        self.add_pre_test_function(self.yocto_pre_test)
        self.add_post_test_function(self.yocto_post_test)
        self.add_checkpoint_function(self.yocto_checkpoint)

    def yocto_drive_setup(self, tests, app=None):
        self.power_data = PowerDataRun()

    def yocto_pre_test(self):
        if self.yocto:
            # start gathering power draw data
            self.ammeter.recording = True

    def yocto_post_test(self):
        if self.yocto:
            # stop the power draw data recorder and get the data
            self.ammeter.recording = False
            data = PowerData.from_yocto_sensors( self.ammeter,
                                                 self.device.voltage_now )
            self.power_data.add_sample(data)

    def yocto_checkpoint(self):
        if self.yocto:
            # convert the power data to json
            power_data_json = self.power_data.to_json()

            # XXX: commented out for now since we don't support graphing the samples just yet.
            # plot the data run
            #self.power_data.plot(self.log_name.replace('.log', '.ps')

            # clear the power data samples
            self.power_data.clear()

        with open(self.log_name, 'a') as log_file:
            if self.yocto:
                log_file.write('%s\n' % power_data_json)

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

