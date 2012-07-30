# Gaia

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

## Tests

## Unit Tests

See: https://developer.mozilla.org/en/Mozilla/Boot_to_Gecko/Gaia_Unit_Tests

### Integration

You need a device / emulator connected and marionette running
on port 2828. For example on a device the steps would be:

0. Make sure b2g desktop / firefox nightly is stopped. ( port 2828 must not
   be occupied)
1. Forward 2828 to your desktop `adb forward tcp:2828 tcp:2828`
2. Run: `make test-integration` 
