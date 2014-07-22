# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import os


class GaiaDataManager(object):

    def __init__(self, marionette, testvars=None):
        from gaia_test import GaiaApps
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
        adn_contacts = self.marionette.execute_async_script('return GaiaDataLayer.getSIMContacts("adn");', special_powers=True)
        sdn_contacts = self.marionette.execute_async_script('return GaiaDataLayer.getSIMContacts("sdn");', special_powers=True)

        return adn_contacts + sdn_contacts

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
