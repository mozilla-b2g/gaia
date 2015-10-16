# Trying out the Sync app

## From master

You can use [this B2G Desktop build](https://www.dropbox.com/s/c83f50wh0uloyag/syncOct8.zip?dl=00).
The steps to run it are:

    Extract the zip file.
    Double click on the .dmg file. This should create a B2G volume.
    Open the Terminal app.
    Execute cd /Volumes/B2G/B2GDebug.app/Contents/MacOS
    Execute ./b2g -profile <path-to-profile> where <path-to-profile> has to be substitute by the local path where you extracted the content of the .zip file + /profile.

Some tips to use B2G Desktop:

    Home button: fn + left arrow
    Long press in Home button: fn + command + left arrow
    If you want to see the output of the JS console, you can add the -jsconsole option to the launch command ( so it would be ./b2g -profile <path-to-profile> -jsconsole)
    Form inputs does not behave properly on B2G Desktop. You will specially notice it when trying to log in with your Firefox Accounts. You'll have to play with the mouse pointer and the tab key to browse through different form inputs.

Remember that in order to be able to use Firefox Sync on B2G, you need to create a Sync account from Desktop or Android first. We are still not showing any error to the user in case that he logs with an inactive Sync account.

## From your own branch

The `profile` folder in the zip file is from gaia master. To build a profile from
your own branch, you need two special settings. In the root of your checked out gaia
repository, run:

````bash
printf "FIREFOX_SYNC := 1\nNOFTU := 1\nDEVICE_DEBUG := 1\n" > local.mk
printf "user_pref(\"services.sync.enabled\", true);\n" > build/config/custom-prefs.js
make clean
make
````

This will create a `./profile` folder which you can either run in the same way as above,
with B2GDebug.app from the zip file, or with a nightly B2G or Mulet (but do make sure it's a
very recent build).

NOFTU will make it skip the first-time-use flow, and DEVICE_DEBUG will allow you
to use `-start-debugger-server 6000` which is a bit more powerful than -jsconsole
if you connect to B2G from your Firefox WebIDE.

If you have any problems, please come to the #fxos-sync irc channel for help.
