# Mozilla Runner 

Node wrapper for creating a child process ([spawn](http://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options))
of a gecko runtime firefox / b2g-desktop.

## Usage

``` js
var run = require('mozilla-runner').run;

// see lib/run.js for all of the options
var options {
  // profile: '/path/to/profile' (product profile)
  // url: 'initial url to start at'
  // argv: ['-jsconsole'] extra flags that this library does not have special handling for

  // run is smart enoguh to figure out where the binary is based on the product name itself.
  // for example on OSX firefox is actually at /Applications/Firefox.app/Contents/MacOS/firefox-bin
  // this means that you safely pass in a directory and expect it to find the binary on linux or OSX.
  product: 'firefox'
};

// options are optional
run('firefox', options, function(err, child) {
  // child is a subprocess that is running firefox

  // ... (do stuff with process)  
  process.kill(); // close it
});

```
## LICENSE

The MIT License (MIT)

Copyright (c) 2015 Sahaja James Lal 

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

