# Test Agent

Test Agent App is an independent module which is different from [js-test-agent].
Unit tests ([mocha]) and coverage ([blanket]) run on this App.

## Note

There include third-party modules such as [blanket], [chai], [mocha], [sinon] and even our test-agent that locate in test-agent/common/vendor/ folder. Except test-agent is copied from js-test-agent when build time, the remaining modules are created by Test Agent App itself.

## About Blanket.js

The [blanket] in test-agent/common/vendor/blanket/blanket.js has been modified for gaia usage. For example, we replaced embedded [esprima] snippet with harmony version for supporting ES6 syntax.

[js-test-agent]: https://github.com/mozilla-b2g/js-test-agent
[mocha]: http://visionmedia.github.io/mocha/
[blanket]: http://blanketjs.org/
[chai]: http://chaijs.com/
[sinon]: http://sinonjs.org/
[esprima]: http://esprima.org/
