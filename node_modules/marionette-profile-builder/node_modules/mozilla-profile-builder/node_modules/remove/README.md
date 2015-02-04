# node-remove

Sync and async versions of `rm -r`, handling both files and directories (something astonishingly missing from `fs`).

````js
var remove = require('remove');

// Asynchronous
remove('/home/esr', function(err){
    if (err) console.error(err);
    else     console.log('success!');
});

// Synchronous
try {
    remove.removeSync('/home/esr');
    console.log('success!');
} catch (err) {
    console.error(err);
}
````


## Installation

Via [npm](http://npmjs.org/):

````sh
npm install remove
````

Or if you want to hack on the source:

````sh
git clone https://github.com/dsc/node-remove.git
cd node-remove
npm link
````


## API

### remove(paths, [options], cb) -> void
### remove.removeAsync(paths, [options], cb) -> void

Asynchronously and recursively remove files and/or directories.

- **paths** *String | Array&lt;String&gt;* &mdash; Path or paths to remove.
- **options** *Object* &mdash; Options object:
    - **verbose** : `false` *Boolean* &mdash; Log all errors and print each path just before it's removed.
    - **sequential** : `false` *Boolean* &mdash; If true, remove the supplied paths sequentially, such that an unsuppressed error would short-circuit further deletes.
    - **ignoreErrors** : `false` *Boolean* &mdash; If false, halt as soon as possible after an error occurs and invoke the callback. When operating in `sequential` mode, this implies an error removing the first of several paths would halt before touching the rest. If set, `ignoreErrors` overrides `ignoreMissing`.
    - **ignoreMissing** : `false` *Boolean* &mdash; Whether to treat missing paths as errors.
- **callback** *Function* &mdash; Completion callback, invoked with null on success and the error on failure.


### removeSync(paths, [options]) -> void

Synchronously and recursively remove files and/or directories.

- **paths** *String | Array&lt;String&gt;* &mdash; Path or paths to remove.
- **options** *Object* &mdash; Options (all optional):
    - **verbose** : `false` *Boolean* &mdash; Log all errors and print each path just before it's removed.
    - **ignoreErrors** : `false` *Boolean* &mdash; If false, halt as soon as possible after an error occurs and invoke the callback. This implies an error removing the first of several paths would halt before touching the rest. If set, `ignoreErrors` overrides `ignoreMissing`.
    - **ignoreMissing** : `false` *Boolean* &mdash; Whether to treat missing paths as errors.


## Feedback

Find a bug or want to contribute? Open a ticket on [github](http://github.com/dsc/node-remove).
You're also welcome to send me email at [dsc@less.ly](mailto:dsc@less.ly?subject=node-remove).

