# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# NOTE: Requires the 'PyBluez' host-side Bluetooth python module
# This has only been tested with PyBluez on Ubuntu 12
# See: http://code.google.com/p/pybluez/wiki/Documentation

import time

from gaiatest.utils.bluetooth.bluetooth_host import BluetoothHost
from gaiatest import GaiaTestCase


class TestBluetoothDiscoverable(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Bluetooth host object
        self.bluetooth_host = BluetoothHost(self.marionette)

        # Disable/enable device bluetooth in case are any active connections
        self.data_layer.bluetooth_disable()
        self.assertFalse(self.data_layer.bluetooth_is_enabled)
        self.data_layer.bluetooth_enable()
        self.assertTrue(self.data_layer.bluetooth_is_enabled)
        time.sleep(30)

        # Remove any existing device pairings so we are starting clean
        self.data_layer.bluetooth_unpair_all_devices()

    def test_discoverable(self):
        # Set our device's bluetooth name uniquely so we can identify it
        device_name = str(time.time())
        self.marionette.log("Setting device's bluetooth name to '%s'" % device_name)
        self.data_layer.bluetooth_set_device_name(device_name)
        time.sleep(5)

        # Place our device in discoverable mode so it can be found by host machine
        self.marionette.log("Setting device discoverable mode ON")
        self.data_layer.bluetooth_set_device_discoverable_mode(True)

        # Have host machine perform inquiry and look for our device
        device_found = self.bluetooth_host.is_device_visible(device_name)
        self.assertTrue(device_found, "Host should see our device (device discoverable mode is ON)")

        # Take the device out of discoverable mode
        self.marionette.log("Setting device discoverable mode OFF")
        self.data_layer.bluetooth_set_device_discoverable_mode(False)
        time.sleep(10)

        # Now have host machine inquire and shouldn't find our device
        device_found = self.bluetooth_host.is_device_visible(device_name)
        self.assertFalse(device_found, "Host shouldn't see our device (device discoverable mode is OFF)")

        # Disable device-side bluetooth
        self.data_layer.bluetooth_disable()
        self.assertFalse(self.data_layer.bluetooth_is_enabled)
