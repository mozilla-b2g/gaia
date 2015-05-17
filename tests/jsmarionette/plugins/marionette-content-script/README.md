# marionette-content-script

A marionette plugin for injecting (or replacing) apis exposed to content
frames (apps, browser tabs)


## Usage

"Injected" scripts will be presented and loaded before all other scripts loaded by normal content.
Currently there is no way to remove a script from the marionette context after exposing it.

```js
// expose to marionette
client.plugin('contentScript', require('marionette-content-script'));

// inject a file from the file system into all page loads
client.contentScript.inject(__dirname + '/myabsolute/path/to/file.js');
```
