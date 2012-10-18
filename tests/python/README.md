
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

    git clone git://github.com/mozilla-b2g/gaia.git
    cd gaia/tests/python
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

If you use the --address localhost:2828 option, you must additionally setup
port forwarding from the device to your local machine.  You can do this by
running the command:

    adb forward tcp:2828 tcp:2828

adb is the 'android debug bridge', and is available in emulator packages under
out/host/linux_x86/bin.  Alternatively, it may be downloaded as part of the
Android SDK, at http://developer.android.com/sdk/index.html.

Writing Tests
=============

Test writing for Marionette Python tests is described at
https://developer.mozilla.org/en-US/docs/Marionette/Marionette_Python_Tests.
Additionally, gaiatest exposes some API's for managing Gaia's lockscreen
and application manager.  See https://github.com/mozilla-b2g/gaia/blob/master/tests/python/gaiatest/gaia_test.py.

