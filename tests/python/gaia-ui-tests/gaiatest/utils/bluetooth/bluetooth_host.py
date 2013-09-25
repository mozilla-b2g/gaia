# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# This requires a host-side Bluetooth adapter and the 'PyBluez' module
# This has only been tested with the PyBluez module on Ubuntu
# See: http://code.google.com/p/pybluez/wiki/Documentation
import bluetooth
import time


class BluetoothHost():

    def __init__(self, marionette):
        self.marionette = marionette

    def inquiry(self):
        # Have the host machine perform a bluetooth inquiry; return devices seen
        nearby_devices = []
        self.marionette.log("Performing host-side bluetooth inquiry...")
        try:
            nearby_devices = bluetooth.discover_devices(duration=10, lookup_names=True)
        except:
            self.marionette.log("Host inquiry failed. Is the host-side bluetooth adaptor enabled?")
        self.marionette.log("Host machine found %d bluetooth device(s) nearby:" % len(nearby_devices))
        for address, name in nearby_devices:
            self.marionette.log("==> %s - %s" % (address, name))
        return nearby_devices

    def is_device_visible(self, device_to_find):
        # Have the host bluetooth adaptor search for the given device; up to 3 attempts
        device_found = False
        attempts = 3
        for attempt in range(attempts):
            nearby_devices = self.inquiry()
            time.sleep(5)
            if len(nearby_devices) == 0:
                continue
            else:
                if any(device_to_find in next_item for next_item in nearby_devices):
                    device_found = True
                    break
        return device_found
