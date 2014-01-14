# each-async [![Build Status](https://secure.travis-ci.org/sindresorhus/each-async.png?branch=master)](http://travis-ci.org/sindresorhus/each-async)

> Async parallel iterator

Like [async.each](https://github.com/caolan/async#eacharr-iterator-callback), but smaller.


## Install

Download [manually](https://github.com/sindresorhus/each-async/releases) or with a package-manager.

#### [npm](https://npmjs.org/package/each-async)

```
npm install --save each-async
```

#### [Bower](http://bower.io)

```
bower install --save each-async
```

#### [Component](https://github.com/component/component)

```
component install sindresorhus/each-async
```


## Examples

### Node.js

```js
var eachAsync = require('each-async');

eachAsync(['foo','bar','baz'], function (item, index, done) {
	console.log(item, index);
	done();
}, function (error) {
	console.log('finished');
});
//=> foo 0
//=> bar 1
//=> baz 2
//=> finished
```

### Bower

```html
<script src="bower_components/each-async/each-async.js"></script>
```

```js
eachAsync(['foo','bar','baz'], function (item, index, done) {
	console.log(item, index);
	done();
}, function (error) {
	console.log('finished');
});
//=> foo 0
//=> bar 1
//=> baz 2
//=> finished
```


## API

### eachAsync(array, callback, finishedCallback)

#### array

The array you want to iterate.

#### callback(item, index, done)

A function which is called for each item in the array with the following arguments:

- `item`: the current item in the array
- `index`: the current index
- `done([error])`: call this when you're done with an optional error. Supplying anything other than `undefined`/`null` will stop the iteration.

Note that order is not guaranteed since each item is handled in parallel.

#### finishedCallback(error)

A function which is called when the iteration is finished or on the first error. First argument is the error passed from `done()` in the `callback`.


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
