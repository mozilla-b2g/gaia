
# Calendar

## Running in Firefox

Would you like to develop the calendar app in Firefox instead of b2g  
desktop? Yes, you would.  

### Step 1: Setup Gaia inside of Firefox

If you have not already done so, follow the steps below to setup Gaia in Firefox.

https://developer.mozilla.org/en-US/docs/Mozilla/Firefox_OS/Using_Gaia_in_Firefox

### Step 2: Run Gaia Calendar!

Start the b2g-desktop instance to serve the calendar app on port 8080  
with  

    cd /path/to/gaia
    DEBUG=1 make
    /path/to/nightly/firefox -jsconsole -profile profile/

Browse to http://calendar.gaiamobile.org:8080/.

### Next Steps

+ Running the unit tests: https://developer.mozilla.org/en-US/docs/Mozilla/Firefox_OS/Platform/Testing/Gaia_unit_tests
+ Helpful command line utilities: https://npmjs.org/package/b2g-scripts

### Distribution and Customization

A calendar.json file may be specified inside of distribution/calendar.json. This will override the generated presets.js file during the build. At a minimum Google Oauth credentials should be provided for production releases. Failure to do so may result in broken calendars at some point.

You can signup for Google credentials here: https://code.google.com/apis/console/b/0/?pli=1#access