Welcome to the official Messaging application for Firefox OS
============================================================
The application's purpose
-------------------------
This application lets users to send SMS (_short messages_) and MMS (_multimedia
messages_) using a phone running Firefox OS.

How to retrieve the code
------------------------
You need `git` and you simply need to run the following command:

```bash
git clone https://github.com/mozilla-b2g/gaia
```

The code for Gaia will be downloaded from Github to a local subdirectory `gaia`.
You can enter the `gaia` directory typing:

```bash
cd gaia
```

How to run the application in Firefox
-------------------------------------

* Always use an uptodate [Firefox Nightly](http://nightly.mozilla.org/). It can
  be broken from time to time, so when it happens you can try using [Firefox
  Aurora](https://www.mozilla.org/fr/firefox/channel/#aurora) instead.

  Keep in mind that we rely on very recent functionalities that are sometimes
  only available in Nightly.

* Generate a debug profile and use it to run Firefox (this will take some time):

```bash
export FIREFOX=/path/to/nightly/firefox
PROFILE_FOLDER=profile-sms DEBUG=1 DESKTOP=0 make
$FIREFOX -profile profile-sms --no-remote app://sms.gaiamobile.org
```

* Press _CTRL-SHIFT-M_ (or _Cmd-Opt-M_ on MacOS X) to switch the Responsive Mode.

### Using the right fonts

You can download the [Fira Sans fonts](http://www.carrois.com/fira-3-1/#download)
and install them on your system. Then configure your Firefox to use them
(_Preferences > Content > Fonts & Colors_, then change the default font, and, in
the advanced panel, proportional, serif and sans serif preferences).

If you use Mulet (see below), this should already be done for you.

### What works fine

In this mode, you can use the DevTools (_CTRL-SHIFT-K_, or _Cmd-Opt-K_ on MacOS
X), debug CSS and JavaScript. But you can even install Firebug if you prefer.

If you modify a file in the application direction, you can simply hit the
_reload_ button to see the changes.

### What doesn't work

* The application uses some limited mocks for most APIs. That means we won't
  remember anything from previous launches.
* The application doesn't run inside Firefox OS. That means cross-application
  communication (eg: activities) doesn't work. That also means it can't receive
  SMS, although we fake this when you try to send a message.
* We don't simulate Dual SIM in this mode.

### What if the application doesn't load correctly?

You should try to delete your profile directory and regenerate it. If it still
doesn't work, please [file a bug](https://bugzilla.mozilla.org/enter_bug.cgi?product=Firefox%20OS&component=Gaia%3A%3ASMS&short_desc=[Messages]%20Running%20the%20application%20in%20Firefox%20is%20broken)
with as much information as you can.

### If I want to simulate more things

Early work has started on a Simulator, which should make it possible to control
the API in a better way. Currently it especially works fine for Dual SIM
support, which makes it easier to debug CSS or JavaScript in this mode.

You can cherry-pick the branch from [Bug 1069338](https://bugzilla.mozilla.org/show_bug.cgi?id=1069338),
and then access _app://sms.gaiamobile.org/simulator/_.

How to run in Mulet
-------------------
Mulet is a new option to run Gaia in an environment that is closer to the device
but where we can use Firefox' tools. [You can find more information on
MDN](https://developer.mozilla.org/en-US/Firefox_OS/Developing_Gaia/Different_ways_to_run_Gaia#Using_Gaia_in_Firefox_Mulet).

How to contribute to the development
------------------------------------
### Filing a good bug

Filing a bug with the right information is already a very good first step
towards fixing a bug.

Here are the important information we need:

* Which device and Firefox OS version do you use? Bonus if you can precise the Build Date,
  the Gaia commit hash, and the Gecko commit hash.
* Describe in a very precise and ordered way the steps you follow to make the bug happen.
* Does the bug happen every time? Otherwise, please precise how many times you
  got the bug in how many tries.
* Provide a screenshot and even a video, if you can. To take a screenshot on a
  Firefox OS device, you can use WebIDE or longpress _Power+Volume Down_ (note: older
  versions used _Power+Home_).

Once you have these informations, you can [file the bug on
Bugzilla](https://bugzilla.mozilla.org/enter_bug.cgi?product=Firefox%20OS&component=Gaia%3A%3ASMS)
and we should handle it in a few days (most of the time before 1 day).

You can find [more information about filing bugs on
MDN](https://developer.mozilla.org/en-US/Firefox_OS/Developing_Firefox_OS/Filing_bugs_against_Firefox_OS).

### Finding a bug to fix

We maintain a list of non-urgent bugs than a contributor can take. Usually we
try to add bugs in this list only if it can be fixed in Firefox using the
previous steps. We can also have more involved bugs though. You can [consult the
bug list](https://bugzilla.mozilla.org/buglist.cgi?f1=bug_mentor&o1=isnotempty&resolution=---&emailtype1=exact&query_format=advanced&emailassigned_to1=1&email1=nobody%40mozilla.org&component=Gaia%3A%3ASMS&product=Firefox%20OS).

We also have a [list of easier bugs that new contributors can
fix](https://bugzilla.mozilla.org/buglist.cgi?o1=isnotempty&emailtype1=exact&status_whiteboard_type=substring&emailassigned_to1=1&status_whiteboard=[good%20first%20bug]&email1=nobody%40mozilla.org&f1=bug_mentor&resolution=---&query_format=advanced&component=Gaia%3A%3ASMS&product=Firefox%20OS).
The goal of these bugs is more about setting up the environment and getting used
to the development process.

And you can also [find bugs in other applications using Bugs Ahoy](http://www.joshmatthews.net/bugsahoy/?b2g=1&unowned=1).

Of course, you can also try to fix bugs that are out of these lists, especially
if these bugs interest you. But please ask to the owners first, as some bugs can
be especially involving and take time.

Once you found you bug, please ask kindly on the bug if you can work on the
issue.

### Fixing the bug and proposing a patch

[A lot of useful information is on MDN already](https://developer.mozilla.org/en-US/Firefox_OS/Developing_Gaia)
so we won't repeat it here. Be careful as MDN explains how to run the full Gaia
in Firefox but we rather use the steps described above for the Messages app
development.

You can also find some information about the Messages app development process
[on the Wiki page for the Messages app](https://wiki.mozilla.org/Gaia/SMS).
Especially you'll find links to the always evolving code style guidelines.

You can discuss on IRC, on the _#gaia_ and _#gaia-messaging_ channels, on the IRC
server _irc.mozilla.org_.

### Running unit tests

You can find [very detailed instructions on
MDN](https://developer.mozilla.org/en-US/Firefox_OS/Platform/Automated_testing/Gaia_unit_tests).
Please refer to those instructions if you have issues.

Here are some basic instructions, assuming your Firefox Nightly is installed in
`~/firefox-nightly/`. Please adjust the instructions to your own environment.

These lines will run what we call the test server: both Firefox and the
background server, that are needed to run the tests:

```bash
export FIREFOX=~/firefox-nightly/firefox
bin/gaia-test
```

The background server runs a watcher that automatically runs tests when the
files are saved. So to run a specific file, you can simply open it in an editor
and save it, or use the command line tool `touch`.

If you want to run all tests for the SMS app, you can run this in a separate
terminal:

```bash
APP=sms make test-agent-test
```

