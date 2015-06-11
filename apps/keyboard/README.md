# Keyboard

Keyboard app enables the user to input with different keyboard layouts and input methods (IME).
The input management (in system app) will launch keyboard app within input window and manage its life cycle.

## Run Build Test

To test keyboard, run

```
TEST_FILES=apps/keyboard/test/build/integration/keyboard_test.js make build-test-integration
```

for build test.

If you change the IME files, the dictionary filesize will be changed as well. Remember to update the test config `dictFileSize` in `apps/keyboard/test/build/integration/resources/`.

## JSDOC

Generated jsdoc is hosted on [http://mozilla-b2g.github.io/gaia/keyboard/](http://mozilla-b2g.github.io/gaia/keyboard/). You can generate it locally with the following command:

```
$ gulp jsdoc:keyboard
```
