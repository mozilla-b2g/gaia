# Gaia [![Build Status](https://travis-ci.org/mozilla-b2g/gaia.png)](https://travis-ci.org/mozilla-b2g/gaia)

Gaia is Mozilla's Phone UX for the Boot to Gecko (B2G) project.

Boot to Gecko aims to create a complete, standalone operating system for the open web.

You can read more about B2G here:

  http://mozilla.org/b2g

follow us on twitter: @Boot2Gecko

  http://twitter.com/Boot2Gecko

join the Gaia mailing list:

  http://groups.google.com/group/mozilla.dev.gaia

and talk to us on IRC:

  #gaia on irc.mozilla.org

See INSTALL file in B2G repository for instructions on building and running B2G. To try out Gaia on desktop, see

  https://wiki.mozilla.org/Gaia/Hacking

# Installing on different devices resolution
### Currently supported screens
  * **qHD**: ~540×960, device pixel ratio = 1.6875
  * **WVGA**: ~480×800, device pixel ratio = 1.5

### How to:
You need to set `HIDPI=1` when using any `make` command

### Examples
`HIDPI=1 make reset-gaia`
`HIDPI=1 make install-gaia`
`HIDPI=1 BUILD_APP_NAME=contacts make install-gaia`


## Tests

### Unit Tests

Unit tests for an app go in `apps/<APP>/test/unit/`.

To run all the unit tests with B2G Desktop:

1. Run `DEBUG=1 make`
2. Run `make test-agent-server &`
3. Run B2G Desktop and open the Test Agent app
4. Run `make test-agent-test`

   or `make test-agent-test APP=<APP>` to run unit tests for a
   specific app

More importantly, you can use test-agent-server to watch the files
on the filesystem and execute relevant tests when they change:

1. Run `DEBUG=1 make`
2. Run `make test-agent-server &`
3. Run B2G Desktop and open the Test Agent app
4. Edit files and when you save them, glance at the console with
   test-agent-server running

Note: If you add new files, you will need to restart test-agent-server.

For more details on writing tests, see:
https://developer.mozilla.org/en/Mozilla/Boot_to_Gecko/Gaia_Unit_Tests

### Integration Tests

Integration tests for an app are located in
`apps/<APP>/test/integration/`.

Prerequisites:

1. adb
2. FirefoxOS Device / Emulator / B2G Desktop

To run integration tests:

1. In your gaia/ directory, run `make` to build the profile
2. Run B2G Desktop

   or forward port 2828 from your device / emulator using
   `adb forward tcp:2828 tcp:2828`

3. Run `make test-integration` from the gaia/ directory

   or `make test-integration APP=<APP>` to run unit tests for a
   specified app

   or `make test-integration TESTS=<PATH/TO/TESTFILE.js>` to run unit
   tests in a specific file

   or `make test-integration REPORTER=<REPORTER>` to run integration
   tests with the specified reporter, for example `XUnit`

   or `make test-integration TESTVARS=<PATH/TO/TESTVARS.json>` to run
   tests with variables in the testvars file (this defaults to
   testvars.json)

Note: If you're using a FirefoxOS Device, it must have been flashed
with a build with marionette enabled. If it doesn't have marionette
enabled, then running `make test-integration` will time out.

The testvars file is a JSON file that maps app names to objects
holding key/values as required by that app's integration tests.  See
that app's integration test code and/or README for which key/values
are required.
