Introduction
============

Gaiatest is a Python package based on
[Marionette](https://developer.mozilla.org/en-US/docs/Marionette), which is
designed specifically for writing tests against
[Gaia](https://github.com/mozilla-b2g/gaia).

Prerequisites
=============

You will need a
[Marionette enabled Firefox build](https://developer.mozilla.org/en-US/docs/Marionette/Builds)
that you can
[successfully connect to](https://developer.mozilla.org/en-US/docs/Marionette/Connecting_to_B2G).

Installation
============

Installation is simple:

    git clone git://github.com/mozilla/gaia-ui-tests.git
    cd gaia-ui-tests
    python setup.py develop

Risks
=====

Please visit [this page](https://developer.mozilla.org/en-US/docs/Gaia_Test_Runner) to understand and acknowledge the risks involved when running these tests.

Command line interface
======================

A helpful command line tool is provided for interacting with Gaia. For full
usage details run `gcli --help` and for help on a specific command use `gcli
<command> --help`.

For example, to unlock the device, set brightness to 100%, connect to an
unsecured network, and launch the Settings app:

```bash
$ gcli unlock
$ gcli setsetting screen.brightness 1
$ gcli connectwifi MozillaGuest
$ gcli launchapp Settings
```

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
    --restart restart target instance between tests. This option will remove 
        the /data/local/indexedDB and /data/b2g/mozilla folders and restore the 
        device back to a common state

Testing on a Device
===================

You must run a build of B2G on the device that has Marionette enabled.
The easiest way to do that is to grab a nightly `eng` build, like
[this one for Unagi](https://pvtbuilds.mozilla.org/pub/mozilla.org/b2g/nightly/mozilla-b2g18-unagi-eng/latest/)
(currently it requires a Mozilla LDAP login). Flash that to your device.

You should not enable Remote Debugging manually on the device because
there will be competing debuggers. See
[bug 764913](https://bugzilla.mozilla.org/show_bug.cgi?id=764913).

If you are running the tests on a device connected via ADB (Android Debug
Bridge), you must additionally set up port forwarding from the device to your
local machine. You can do this by running the command:

    adb forward tcp:2828 tcp:2828

ADB is available in emulator packages under out/host/linux_x86/bin.
Alternatively, it may be downloaded as part of the
[Android SDK](http://developer.android.com/sdk/index.html).

Testing on Desktop build
========================

You can download the latest build of the desktop client from [this location](http://ftp.mozilla.org/pub/mozilla.org/b2g/nightly/latest-mozilla-b2g18/),
but make sure you download the appropriate file for your operating system.

Note : Unfortunately, due to [Bug 832469](https://bugzilla.mozilla.org/show_bug.cgi?id=832469) the nightly desktop builds do not currently work on Windows, so you will
need either Mac or Linux to continue :

  * **Mac**: b2g-[VERSION].multi.mac64.dmg
  * **Linux (32bit)**: b2g-[VERSION].multi.linux-i686.tar.bz2
  * **Linux (64bit)**: b2g-[VERSION].multi.linux-x86_64.tar.bz2

Note : If you do not have the operating systems installed on your machine, a virtual machine is fine as well.

Once downloaded, you will need to extract the contents to a local folder. For the purposes of the rest
of this guide, I’ll refer to this location as `$B2G_HOME`.


Add the line `user_pref('marionette.force-local', true);` to your gaia/profile/user.js file, which on :

  * **Mac** is located in $B2G_HOME/B2G.app/Contents/MacOS
  * **Linux** is located in $B2G_HOME/b2g

Because we’re running against the desktop client we must filter out all tests that are unsuitable. To run the tests, use the following command:

`gaiatest --address=localhost:2828 --type=b2g-antenna-bluetooth-carrier-camera-sdcard-wifi-xfail gaiatest/tests/manifest.ini`

You should then start to see the tests running.

Test Types
==========
Tests can be filtered by type, and the types are defined in the manifest files. Tests can belong to multiple types, some
types imply others, and some are mutually exclusive - for example a test cannot be both 'online' and 'offline' but a
test that is 'lan' is by definition 'online'. Be warned that despite these rules, there is no error checking on types,
so you must take care when assigning them. Default types are set in the [DEFAULT] section of a manifest file, and are
inherited by manifest files referenced by an include.

Here is a list of the types used, and when to use them:

* b2g - this means the test is a B2G (Firefox OS) test. All tests must include this type.
* antenna - these tests require an antenna (headphones) to be connected.
* bluetooth - requires bluetooth to be available.
* camera - these tests require use of a camera.
* carrier - an active SIM card with carrier connection is required.
* lan - a local area connection (not cell data) is required by these tests (see note below).
* offline - specifically requires no online connection.
* online - some sort of online connection (lan or carrier) is required.
* qemu - these tests require the Firefox OS emulator to run.
* sdcard - a storage device must be present.
* wifi - this means a WiFi connection is required.
* xfail - a special type that indicates the test is expected to fail.

You may be thinking that there is only WiFi or cell data, and why the need for the 'lan' test type. Well, these tests
aren't only run on mobile devices... We also run then on single-board computers known as
[pandaboards](https://en.wikipedia.org/wiki/Panda_Board), which have an ethernet port, and on desktop builds, which
share the host computer's connection. It is for this reason that we need 'lan' to indicate a connection that is not cell
data. For an example of where online/lan/carrier are used take a look at the browser tests.

Test Variables
==============
We use the --testvars option to pass in local variables, particularly those that cannot be checked into the repository. For example in gaia-ui-tests these variables can be your private login credentials, phone number or details of your WiFi connection.

To use it, copy testvars_template.json to a different filename but add it into .gitignore so you don't check it into your repository.

When running your tests add the argument:
    --testvars=(filename).json

Variables:

`"carrier": {} (dict)` The carrier information of the test phone. This contains the phone number, country and network of the SIM card.

```
"carrier":{
    "phone_number": "",
    "country": "",
    "network": ""
}
```
`"imei": "" (string)` The 12 digit IMEI code of the test phone.
`"remote_phone_number": "" (string)` A phone number that your device can call during the tests (try not to be a nuisance!). Prefix the number with '+' and your international dialing code.
`"wifi":{}{ (dict)` This are the settings of your WiFi connection. Currently this supports WPA/WEP/etc. You can add WiFi networks by doing the following (remember to replace "KeyManagement" and "wep" with the value your network supports) :

```
"wifi": {
    "ssid": "MyNetwork",
    "keyManagement": "WEP",
    "wep": "MyPassword"
}
```

WPA-PSK:
```
"wifi": {
    "ssid": "MyNetwork",
    "keyManagement": "WPA-PSK",
    "psk": "MyPassword"
}
```
__Note__: Due to [Bug 775499](http://bugzil.la/775499), WiFi connections via WPA-EAP are not capable at this time.

`"email": {} (dict)` The email login information used by the email tests. It can contain different types of email accounts:

Gmail:
```
"gmail": {
       "name": "",
       "email": "",
       "password": ""
    }
```

Or different email protocols:
```
"IMAP": {
    "name": "",
    "email": "",
    "password": "",
    "imap_hostname": "",
    "imap_name": "",
    "imap_port": "",
    "smtp_hostname": "",
    "smtp_name": "",
    "smtp_port": ""
}
```
Or:
```
"ActiveSync":{
    "name": "",
    "email": "",
    "password": "",
    "active_sync_hostname": "",
    "active_sync_username": ""
}
```
`"settings": {} (dict)` Custom settings to override the Gaia default settings. These will be set before each test run but are not mandatory.
```
"settings:{
    "<setting>":<value>
}"
```


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


