# RawCache
A middleware layer for [ServiceWorkerWare](https://github.com/gaia-components/serviceworkerware/) that will allow you to modify the content of a cache via HTTP verbs.

## Usage
In your ServiceWorker code:

```
importScripts('./sww.js');
importScripts('./sww-raw-cache.js');

var worker = new self.ServiceWorkerWare();
worker.use(new RawCache({ cacheName: 'default' }));

worker.init();
```

You create a new `RawCache` object, and pass an options hash with the name of the cache that this middleware will be handling.
