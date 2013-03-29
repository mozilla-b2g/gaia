Introduction
============

Gaiatest is a Python package based on
[Marionette](https://developer.mozilla.org/en-US/docs/Marionette), which is
designed specifically for writing tests against
[Gaia](https://github.com/mozilla-b2g/gaia).

Installation
============

Installation is simple:

    easy_install gaiatest

If you anticipate modifying gaiatest, you can instead:

    git clone git://github.com/mozilla/gaia-ui-tests.git
    cd gaia-ui-tests
    python setup.py develop

Running Tests
=============

To run tests using gaia test, your command-line will vary a little bit
depending on what device you're using.  The general format is:

    gaiatest [options] /path/to/test_foo.py

Options:

    --emulator arm --homedir /path/to/emulator:  use these options to 
        let Marionette launch an emulator for you in which to run a test
    --address <host>:<port>  use this option to run a test on an emulator
        which you've manually launched yourself, a real device, or a b2g
        desktop build.  If you've used port forwarding as described below,
        you'd specify --address localhost:2828
    --testvars= (see section below)

If you are running the tests on a device connected via ADB (Android Debug 
Bridge), you must additionally setup port forwarding from the device to your 
local machine. You can do this by running the command:

    adb forward tcp:2828 tcp:2828

ADB is available in emulator packages under out/host/linux_x86/bin. 
Alternatively, it may be downloaded as part of the 
[Android SDK](http://developer.android.com/sdk/index.html).

Testvars
========
We use the --testvars option to pass in local variables, particularly those that cannot be checked into the repository. For example in gaia-ui-tests these variables can be your private login credentials, phone number or details of your WiFi connection.

To use it, copy testvars_template.json to a different filename but add it into .gitignore so you don't check it into your repository.

When running your tests add the argument:
    --testvars=(filename).json

Variables:

`this_phone_number (string)` The phone number of the SIM card in your device. Prefix the number with '+' and your international dialing code.

`remote_phone_number (string)` A phone number that your device can call during the tests (try not to be a nuisance!). Prefix the number with '+' and your international dialing code.

`wifi.ssid (string)` This is the SSID/name of your WiFi connection. Currently this supports WPA/WEP/etc. You can add wifi networks by doing the following (remember to replace "KeyManagement" and "wep" with the value your network supports) :

`
"wifi": {
    "ssid": "MyNetwork",
    "keyManagement": "WEP",
    "wep": "MyPassword"
}
`

` WPA-PSK:
"wifi": {
    "ssid": "MyNetwork",
    "keyManagement": "WPA-PSK",
    "psk": "MyPassword"
}
`

` Marketplace:
"marketplace": {
    "username": "MyUsername",
    "password": "MyPassword"
}
`


__Note__: Due to [Bug 775499](http://bugzil.la/775499), WiFi connections via WPA-EAP are not capable at this time.

Test data Prerequisites
=======================

Occasionally a test will need data on the hardware that cannot be set during the test setUp.
The following tests need data set up before they can be run successfully:

`test_ftu` Requires a single record/contact saved onto the SIM card to test the SIM contact import


Writing Tests
=============

Test writing for Marionette Python tests is described at
https://developer.mozilla.org/en-US/docs/Marionette/Marionette_Python_Tests.

Additionally, gaiatest exposes some API's for managing Gaia's lockscreen
and application manager.  See https://github.com/mozilla-b2g/gaia/blob/master/tests/python/gaiatest/gaia_test.py.

At the moment we don't have a specific style guide. Please follow the
prevailing style of the existing tests. Use them as a template for writing
your tests.
We follow [PEP8](http://www.python.org/dev/peps/pep-0008/) for formatting, although we're pretty lenient on the
80-character line length.
