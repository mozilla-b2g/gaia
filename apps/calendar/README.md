# Calendar

This is the home of the Firefox OS calendar app.

### Directory Structure

```
build/            => calendar build configuration
elements/         => lazy loaded html elements (see /shared/js/html_imports.js)
js/               => calendar application code
js/controllers/   => various utilities living between views and models
js/ext/           => dependency / external javascript libraries
js/models/        => model wrappers around indexedDB calendar data
js/provider/      => provides apis to frontend code running on the main thread
                     to send tasks to web worker. right now all of our database operations
                     run on the main thread (https://bugzil.la/701634). common pattern is to
                     send a sync operation to the worker which emits events to the
                     provider code which formats calendar data and shoves it in indexedDB
js/service/       => runs in worker and bridges communication between main thread and caldav library
js/store/         => wrappers around calendar database collections
js/utils/         => miscellaneous library code mostly for computing or storing things
                     synchronously in memory
js/views/         => javascript that manages the dom representation for the UI
                     makes calls to model and provider layers to accomplish backend tasks
                     often listens to store events for data changes and updates the UI
js/worker/        => abstraction on top of web worker api, facilitates main thread <> worker
locales/          => translations to various locales exposed via l10n
style/            => css, fonts, images, etc.
test/             => calendar test code
test/interop/     => calendar client <> server interoperability tests that use marionette
test/marionette/  => webdriver tests written with the marionette-js-runner framework
test/unit/        => javascript unit tests run in the browser via test-agent
```

#### A note about js/ext

The external libraries versioned in js/ext are populated by [volo](http://volojs.org/) which saves their url, version, git tag, etc in `package.json`. Check out the documentation [here](https://github.com/volojs/volo/tree/master/commands) for help adding, updating, and removing dependencies.

### Interop Tests

We have a test suite that checks whether or not we're interoperable with a particular calendar server. In order to run the test suite against your favorite server:

1. Add a file named `config.json` at `apps/calendar/test/interop/<provider>/config.json`. The json configuration file needs to have
  + user (username)
  + password (user password)
  + fullUrl (url for caldav server)
  + calendars (array of caldav calendar display names)
2. Make sure that your provider is in the list of providers located at `apps/calendar/test/interop/basic.js`.
3. Execute `TEST_FILES=apps/calendar/test/interop/basic.js ./bin/gaia-marionette`

### Related material

+ Unit tests: https://developer.mozilla.org/en-US/docs/Mozilla/Firefox_OS/Platform/Testing/Gaia_unit_tests
+ Integration tests: https://developer.mozilla.org/en-US/Firefox_OS/Platform/Automated_testing/Gaia_integration_tests
+ Calendaring: http://calconnect.org/
+ CalDAV spec: http://tools.ietf.org/html/rfc4791
+ CalDAV library: https://github.com/mozilla-b2g/caldav
+ iCalendar spec: http://tools.ietf.org/html/rfc5545
+ iCalendar library: https://github.com/mozilla-comm/ical.js
+ Helpful command line utilities: https://npmjs.org/package/b2g-scripts

### Distribution and Customization

A calendar.json file may be specified inside of distribution/calendar.json. This will override the generated presets.js file during the build. At a minimum Google Oauth credentials should be provided for production releases. Failure to do so may result in broken calendars at some point.

You can signup for Google credentials here: https://code.google.com/apis/console/b/0/?pli=1#access

## JSDOC

Generated jsdoc is hosted in [http://mozilla-b2g.github.io/gaia/calendar/](http://mozilla-b2g.github.io/gaia/calendar/). You can generate it locally with following command:

```
$ gulp jsdoc:calendar
```
