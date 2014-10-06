# Test TBPL

# Gaia

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

## Autolander (bot)

Autolander is a bot which integrations github and bugzilla workflows.

Features available:
  - Automatic pull request to bugzilla attachment linking.
  - Automatic landing, on green integration run, with a R+ from a suggested reviewer and the autoland keyword.
  - Comments in the bug with the landed commit, and marks the bug as fixed.
  - Validates pull request title and commit message formats.
  - Currently only runs a subset of the gaia CI tests which are stable on taskcluster. Ensure you have a green gaia-try run before adding the autoland keyword.
  - See more at: https://github.com/mozilla/autolander [The Autolander guide on MDN](https://developer.mozilla.org/en-US/Firefox_OS/Developing_Gaia/Submitting_a_Gaia_patch#Easy_patch_submission_with_Autolander)


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
[marionette-js-runner](https://developer.mozilla.org/en-US/Firefox_OS/Automated_testing/Gaia_integration_tests)
for ui testing. For the time being, tests need to live in `apps/<some
app>/test/marionette` and should be named `*_test.js`. Gaia's marionette
tests run on nodejs and you'll need nodejs>=v0.10 installed.

Also for the time being, shared code for tests lives in plugins at
`tests/jsmarionette/plugins` or in helpers at `shared/test/integration`.

#### Running integration tests

```sh
npm run marionette
```

#### Invoking specific test files

```sh
TEST_FILES="/abs/path/to/some_test.js /abs/path/to/other_test.js" npm run marionette
```

#### Invoking tests for a specific app

```sh
APP=<APP> npm run marionette
```

#### Skipping a test file

```sh
SKIP_TEST_FILES="/abs/path/to/skipped_test.js /abs/path/to/other/skipped_test.js" npm run marionette
```

#### Moar things

+ `VERBOSE=1` pipes gecko logs to your command line process for debugging.

+ If you don't have a b2g/ folder one will be downloaded for you.
  This can be problematic if you're offline. You can symlink a
  b2g-desktop directory to b2g/ in gaia to avoid the download.

### Build System Tests

Build system has its own unit test and integration test. Both are running on [Node.js](http://nodejs.org)

#### Build System Unit Tests

To run unit test locally, using following command:

```
$ make build-test-unit
```

#### Build System Integration Tests

To run integration test locally, using following command:

```
$ make build-test-integration
```

#### Invoking specific test files

Both the build unit or integration test can invoke specific test files by TEST_FILES

```
make build-test-unit TEST_FILES=<test file path>
```

```
make build-test-integration TEST_FILES=<test file path>
```

For example, we could run the `keyboard_test.js` build integration test in keyboard app with the below command.
```
make build-test-integration TEST_FILES=apps/keyboard/test/build/integration/keyboard_test.js
```

If you would like to run more than one test, we could do the below command.
```
make build-test-integration TEST_FILES="apps/keyboard/test/build/integration/keyboard_test.js apps/keyboard/test/build/integration/keyboard_layout_test.js"
```

## Generate JSDOC

To generate API reference locally, run `make docs` command to generate docs. The generated per app API docs will be located in `docs` folder.

You could generate single app doc with this:

```sh
$ gulp jsdoc:system
```
