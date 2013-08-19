# 0.3.0
Adding TCP driver for node

# 0.2.0
  - Added support for wrapping/unwrapping elements
    in script functions.

  - executeScript, executeJsScript, executeAsyncScript now accept
     either a string or a function as the script argument.
 
  - Added .scriptWith function to Marionette.Element that will
    automatally pass that element to a remote script.

# 0.1.1
  - Reenable executeAsyncScript it will work
    in b2g with generators.

# 0.1.0
  - HttpPolling driver now supported in node.
  - goUrl command is now supported.
  - getAttribute was updated to support newer marionette.
  - Error handling for when connections fail to be setup (connect in
    drivers)

  - Fixed error related to out of order responses if chaining directly
    after connect.

  - close method to be supported in drivers to closing marionette
    connections.

# 0.0.2
  - marionette.js cleanup and cosmetic fixes.

# 0.0.1
  - Initial release with support for the majority of all marionette
    server commands. No error handling in client though.
