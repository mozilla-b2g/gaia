# JSHint hints

## Why moving to jshint?
gjslint is stuck supporting some old standards, jshint is more up-to-date, and also maintained by mozilla's own https://mozillians.org/en-US/u/anton/. Also, gjslint is making non-configurable opinionated rules about styles.

## How

Over time we will switch files over to being linted by jshint instead of gjslint,
we will acomplish this by having a `build/jshint/xfail.list` file in the gaia project.
Each js file listed in this file does not currently pass jshint, and therefore
will still be checked by gjslint. It will also be parsed by jshint, but the errors
it finds will be considered only warnings!
If a file is not present in the `build/jshint/xfail.list`, we will no longer test it in gjslint.
This is different from `.jshintignore` (which is a list of files to ignore by both linters, external libraries, etc).

So whenever you fix the jshint errors for one file, don't forget to remove it
from `build/jshint/xfail.list`!

From the Gaia root directory:
* Run `make lint` to lint your code using this rule.
* Run `make hint` to lint the Gaia code using jshint. Use `VERBOSE=1` to see all
  xfailed errors.
* Run `make gjslint` to lint the only the files from `build/jshint/xfail.list` using gjslint

You can use `APP=<app directory>` (eg `APP=sms`) to restrict the run to a
specific application.

## Commiting

The pre-commit hook will warn you when files you edit are in the `build/jshint/xfail.list`. Otherwise it uses the same rules as described above.

## Fixing simple things

First of all, if the errors you see are simple, you will probably want to just fix them so we can remove the file from `build/jshint/xfail.list`.  Always check with your module peers before cleaning up a file just to clean it up however.  If there are any questions about hint errors feel free to ask in #gaia in IRC for someones opinion.

Here are a few of the "simple" hint errors you might encounter and how to fix them:

### `Missing "use strict" statement`

Add it! It should be in every file in gaia!

You can either put it at the top:

```js
'use strict';
```

Or if there happens to be an immediately invoked function closing over the whole file, add it there:

```js
(function() {
    'use strict';
    // ....
}());
```

### `'NameOfSomeGlobal' is not defined.`

First you need to check if you actually should use that global, as this can be a programming mistake.  Was this someone forgetting to put `var` on something.  Is this some `var` in the outer scope you weren't planning on making "global"?  These sort of fixes might not fall under the "tiny" problems category, you might want to wait until a later date to refactor these.

Most of the time, in your initial fixing, this will be another module's exported object. All you need to do to fix this problem is define the global in a comment at the top of the file:

```js
/* global NameOfSomeGlobal */
```

This implies a read only global identifier.  You can still assign properties to it, but means you will not write to it.  `NameOfSomeGlobal = true;` would fail, but `NameOfSomeGlobal.someThing = 10` works!

**Note:** `window.NameOfSomeGlobal` will not be detected as a global.  This should not be used as a way to work around declaring a global however.

If this global is something that is global in the browser environment, i.e. `URL` or `location` we could add it to the global globals list in `.jshintrc`.

We suggest keeping your global definitions alphabetically ordered, one line for each global at the top of the file for clarity sake.  If you notice that your file has a large number of globals, you might want to use the more consise format shown below, however this is generally a clue there is a problem in your application architecture. BTW see how it can easily show the architecture of your application.

```js
// example of too many globals - use commas to separate, whitespace is not sufficient
/* global ActivityHandler, ActivityPicker, Attachment, AttachmentMenu, Compose,
    Contacts, Dialog, LinkActionHandler, LinkHelper, MessageManager,
    MozActivity, MozSmsFilter, OptionMenu, Recipients, SMIL, Settings,
    Template, ThreadListUI, Threads, TimeHeaders URL, Utils, WaitingScreen */
```

If you are exporting this variable (and therefore writing to it) you should use `/* exported NameOfSomeGlobal */` or `/* global NameOfSomeGlobal:true */` (see next part too).

### `'NameOfSomething' is defined but never used.`

This could mean a few different things:

* There is a function argument or variable that is never referenced, you should remove it!

* There is a function/variable which you "export" to another file and therefore never use inside the file, you must declare an export:

```js
/* exported NameOfSomething */
```

### `Expected '{' and instead saw -----`

This is probably just an if statement missing curlies - Fix them!

## Overriding and extending the main .jshintrc

JSHint supports both overriding and extending configuration files. This means two different things:
* that it is possible to use different configuration files for subdirectories
* that it is possible to inherit from the main .jshintrc to change only some configuration properties

This is especially useful to change the list of predefined globals. See for
example https://github.com/mozilla-b2g/gaia/blob/master/apps/sms/test/unit/.jshintrc

## The trickier problems

We suggest waiting to fix a file with a bunch of errors until a stable time between branches when the code is less likely to create merge conflicts while bringing fixes back to old branches.
If you are planning on refactoring a bigger problem file, you should definitely fix the hint first!

## How to generate the xfail.list from scratch

You can run the following command:

```bash
( export LC_ALL=C ; ./node_modules/.bin/jshint apps shared | awk -F: '{ print $1 }' | sort | uniq | grep '\.js$' ) > build/jshint/xfail.list
```

