Testing the new try server hook
# Gaia [![Build Status](https://travis-ci.org/mozilla-b2g/gaia.svg)](https://travis-ci.org/mozilla-b2g/gaia)

Gaia is Mozilla's Phone UX for the Boot to Gecko (B2G) project.

Boot to Gecko aims to create a complete, standalone operating system for the open web.

You can read more about B2G here:

> [http://mozilla.org/b2g](http://mozilla.org/b2g)

follow us on twitter: @Boot2Gecko

> [http://twitter.com/Boot2Gecko](http://twitter.com/Boot2Gecko)

join the Gaia mailing list:

> [http://groups.google.com/group/mozilla.dev.gaia](http://groups.google.com/group/mozilla.dev.gaia)

and talk to us on IRC:

>  #gaia on irc.mozilla.org

## Hacking Gaia

[The Gaia/Hacking page on MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox_OS/Platform/Gaia/Hacking) has all the information that you need to start working on Gaia, including building and running Gaia on a compatible device or desktop computer.

## Shepherd (bot)

Opt-into new features by adding +shepherd to your first commit.

Features available:
  - automatic github -> bugzilla linking


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

As a convenience, you can also use the `gaia-test` script to launch the
test-agent-server and open the Test Agent app in firefox:

1. Add firefox to your `$PATH` or set `$FIREFOX` to your preferred
   firefox/aurora/nightly binary.
2. Run `./bin/gaia-test` to run the test-agent-server and launch firefox.
3. Run `make test-agent-test` or modify files as described above.

For more details on writing tests, see:
https://developer.mozilla.org/en/Mozilla/Boot_to_Gecko/Gaia_Unit_Tests

### Integration Tests

Gaia uses
[marionette-js-runner](https://github.com/mozilla-b2g/marionette-js-runner)
to run the tests with a custom builder for gaia. Tests should live with the rest of your apps code (in apps/my_app/test/marionette) and
test files should end in _test.js.

All integration tests run under a node environment. You need node >= 0.10
for this to work predictably.

Shared code for tests lives under shared/test/integration.

#### Running integration tests

NOTE: unless your tests end in _test.js they will not be
automatically picked up by `make test-integration`.

```sh
make test-integration
```

#### Invoking a test file

```sh
make test-integration TEST_FILES=<test>
```

For example, we could run the `day_view_test.js` test in calendar app with the below command.
```
make test-integration TEST_FILES=apps/calendar/test/marionette/day_view_test.js
```

If you would like to run more than one test, we could do the below command.
```
make test-integration TEST_FILES="apps/calendar/test/marionette/day_view_test.js apps/calendar/test/marionette/today_test.js"
```

#### Invoking tests for a specific app

```sh
make test-integration APP=<APP>
```

For example, we could run all tests for the calendar app with `make test-integration APP=calendar`.

#### Skipping a test file
```sh
make test-integration SKIP_TEST_FILES=<test>
```
For example, we could skip the `day_view_test.js` test in calendar app with the below command.
```
make test-integration SKIP_TEST_FILES=apps/calendar/test/marionette/day_view_test.js
```

If you would like to skip more than one test, we could do the below command.
```
make test-integration SKIP_TEST_FILES="apps/calendar/test/marionette/day_view_test.js apps/calendar/test/marionette/today_test.js"
```

Notice that we could not use the `TEST_FILES` and `SKIP_TEST_FILES` parameters at the same time.

#### Running tests while working

If you wish to run many tests in background you might not want to be disturbed
by the b2g-desktop window popping everytime, or the sound. One solution for
the first issue is to use Xvfb:

```sh
xvfb-run make test-integration
```

If you are using PulseAudio and want to keep the tests quied, then just force
an invalid server:

```sh
PULSE_SERVER=":" make test-integration
```

You can of course combine both:

```sh
PULSE_SERVER=":" xvfb-run make test-integration
```

#### Running tests without building profile

if you would like to run tests without building profile, use `make test-integration-test`:
```sh
PROFILE_FOLDER=profile-test make # generate profile directory in first time
make test-integration-test
```

#### Debugging Tests

To view log out from a test

```sh
make test-integration VERBOSE=1
```

#### Where to find documentation
  - [Node.js](http://nodejs.org)

  - [MDN: for high level overview](https://developer.mozilla.org/en-US/docs/Marionette/Marionette_JavaScript_Tools)
  - [mocha: which is wrapped by marionette-js-runner](http://visionmedia.github.io/mocha/)
  - [marionette-js-runner: for the test framework](https://github.com/mozilla-b2g/marionette-js-runner)
  - [marionette-client: for anything to do with client.X](http://lightsofapollo.github.io/marionette_js_client/api-docs/classes/Marionette.Client.html)

#### Gotchas

- For performance reasons we don't run `make profile` for each test
  run this means you need to manually remove the `profile-test`
  folder when you make changes to your apps.

- If you don't have a b2g folder one will be downloaded for you.
  This can be problematic if you're offline. You can symlink a
  b2g-desktop directory to b2g/ in gaia to avoid the download.

- If you have some weird node errors, try removing node_modules since
  things may be stale.

- To get debug information from the b2g desktop client, run this:
`DEBUG=b2g-desktop TEST_FILES=name/of/test.js ./bin/gaia-marionette`

- To get debug information from b2g desktop and all of the marionette
plugins, run this:
`DEBUG=* TEST_FILES=name/of/test.js ./bin/gaia-marionette`

### UI Tests

#### Functional

See [Gaia functional tests README](https://github.com/mozilla-b2g/gaia/blob/master/tests/python/gaia-ui-tests/README.md)

#### Endurance

See [how to run the Gaia endurance tests](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox_OS/Platform/Automated_testing/endurance_tests/how_to_run_gaiaui_endurance_tests)

## Generate jsdoc

To generate API reference locally, you have to install grunt with following command:

```sh
$ npm -g grunt-cli
```

then run `make docs` command to generate docs.
The generated API docs will be located in `docs` folder.

You could generate single app doc with this:

```sh
$ grunt jsdoc:system
```
