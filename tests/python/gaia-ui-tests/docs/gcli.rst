Command line interface
======================

A helpful command line tool is provided for interacting with Gaia. For full
usage details run ``gcli --help`` and for help on a specific command use ``gcli
<command> --help``.

For example, to unlock the device, set brightness to 100%, connect to an
unsecured network, and launch the Settings app::

    gcli unlock
    gcli setsetting screen.brightness 1
    gcli connectwifi MozillaGuest
    gcli launchapp Settings
