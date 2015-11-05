importScripts('../bower_components/serviceworkerware/dist/sww.js');
importScripts('../dist/sww-raw-cache.js');

var worker = new ServiceWorkerWare();
worker.use(new self.StaticCacher(['index.html', 'sw.js']));
worker.use(new RawCache({
  cacheName: 'rawCache'
}));
worker.use(new self.SimpleOfflineCache());

worker.init();
