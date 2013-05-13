# 0.7.3
  - fixed a bug where numerious extra sockets where opened.
  - added python client hack v1

# 0.7.2
  - console.log will now be grouped with its environment when available.
  - debug option for displaying raw websocket data (DEBUG=test-agent:websocket-raw).

# 0.7.1
  - Fix console.log in firefox where in some cases array items where
    cast as undefined instead of their true value.

# 0.7.0
  - safari 5 support.
  - Fixed stack bug for safari when using wrapped console.log
  - fixed general test assertion errors when running test-agent test
    suite in safari
  - attribute options on iframes for multidomain driver
  - missing files will no longer cause the test runner to 
    be unresponsive until reload.

# 0.6.4
  - Workaround ws breaking changes.

# 0.6.3
  - Fix #22 by implementing require queues.
    Now nested requires should work as expected.

# 0.6.2
  - Fixed issues where errors thrown from setup/beforeEach would
    not be formatted correctly, due to a missing test.type /
    err.uncaught options

# 0.6.1
  - Added wait-for-event option to js-test-agent test

# 0.6.0
  - Added new option and enhancement to server that will
    timeout if a specific event is not fired within a fixed amount of time.

# 0.5.4
  - Fixed ws constructor bug introduced by 0.5.3

# 0.5.3
  - Moved Websocket lookups into the constructor of WebsocketClient

# 0.5.2
  - export-error can now handle strings correctly for
    cases like window.onerror when a string is given instead of an
    Error instance.

# 0.5.1
  - Added option to specify websocket server in test-agent test
  - Fixed issue where websocket client would try to send when connection
    is closed.

# 0.5.0
  - Test UI button will now show busy when tests are running.
    Clicking on the button will no longer cause tests to run when
    in this state.

  - Added option to turn off/change reporter for mocha driver.
    Use the reporter option when using the enhancement.

# 0.4.1
  - Removed add test env in favor of set test env.
  - Fixed bugs related to add test env by removing it with set test env.

# 0.4.0
  - Ported all node/mocha/ scripts to test-agent/mocha/ they will now
    run in both the browser and server

  - Removed support for syntax error handling.
    It has some bugs which made it unstable.
    New test data based error handling will be introducted in v0.5

  - Adding support for running tests across different domains via
    iframes. This will eventually lead to multi worker support between
    browsers.

  - Fixed issue where websocket retry would not close the previous
    socket cleanly causing events to occasionally fire twice.

# 0.3.1
  - Add missing WebsocketClient.close method

# 0.3.0
  - Cleaner firefox stacktraces
  - New option to change type of required scripts.

# 0.2.0
  - TestAgent.Responder now has .once (per event emitter spec)
  - Fixed XUnit reporter support
  - Added event mirroring support you can now send a message 
    to the server and all events of those types will be forwarded or
    mirrored to your client websocket.
  - Added base node/client as a building block for new commands
  - improved test-agent test. It now offers an option of reporters and
    will show reports in stdout with correct exit status on
    error/success.

# 0.1.2
  - calling require on cached script url will now
    correctly fire after (or if) the script has been loaded.

# 0.1.1

- Syntax errors that occur during the run will now also cause
  a test error.

# 0.1.0
- Added much better remote console.log by using node's console.log code.
- Added syntax error handling to sandbox with ui, growl and reporter
  notifications.
