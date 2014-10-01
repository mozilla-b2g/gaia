# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# This requires a host-side Bluetooth adapter and the 'BT-Manager' module
# This has only been tested with the BT-Manager module on Ubuntu
# See: https://pythonhosted.org/BT-Manager
import bt_manager
import time
import dbus

# FIXME Find the gaiatest mainloop
# dbus.set_default_main_loop(main)

class BluetoothHost():

    def __init__(self, marionette):
        self.marionette = marionette
        self.host_name = "gaia-ui-test-" + str(time.time())

        self._nearby_devices = {}
        self._paired_devices = []

        self._adapter = bt_manager.BTAdapter()
        self._adapter.set_property('Name', self.host_name)
        self._adapter.add_signal_receiver(self._on_device_found, self._adapter.SIGNAL_DEVICE_FOUND, user_arg=None)
        self._adapter.add_signal_receiver(self._on_device_created, self._adapter.SIGNAL_DEVICE_CREATED, user_arg=None)

        self.discoverable = True

    def is_device_visible(self, device_to_find):
        # Have the host bluetooth adaptor search for the given device; up to 3 attempts
        device_found = False
        attempts = 3
        self._adapter.start_discovery()
        for attempt in range(attempts):
            time.sleep(5)
            for address, name in self._nearby_devices:
                self.marionette.log('==> %s - %s' % (address, name))
            if len(self._nearby_devices) == 0:
                continue
            else:
                if device_to_find in self._nearby_devices:
                    device_found = True
                    break
        self._adapter.stop_discovery()
        return device_found

    def is_device_paired(self, device_to_find):
        # WIP
        return True

    @property
    def discoverable(self):
        return self._adapter.get_property('Discoverable')

    @discoverable.setter
    def discoverable(self, value):
        self._adapter.set_property('Discoverable', value)

    def remove_paired_devices(self):
        paired_devices_path = self._paired_devices
        for paired_device_path in paired_devices_path:
            self._adapter.remove_device(paired_device_path)

    def _on_device_found(self, *args):
        # args are as:
        # 0: Event ('DeviceFound')
        # 1: user_arg
        # 2: Device address
        # 3: Device object
        # 4: Signature
        device_address = args[2]
        device_address = str(device_address)    # Converts from dbus.String
        device_dict = args[3]
        device_name = str(device_dict['Alias'])
        if device_name not in self._nearby_devices:
            self._nearby_devices[device_address] = device_name

    def _on_device_created(self, *args):
        # args are as:
        # 0: Event ('DeviceCreated')
        # 1: user_arg
        # 2: Device path in dbus (like '/org/bluez/%BLUETOOTH_PID%/hci0/dev_%ADDRESS%')
        device_path = str(args[2])
        self._paired_devices.append(device_path)
