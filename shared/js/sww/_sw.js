importScripts('/_files.js'); // kCacheFiles
importScripts('/shared/js/sww/sww.js');
var worker = new ServiceWorkerWare(function(req, res) {
  if (res) { return Promise.resolve(res); }
  return fetch(req);
});
worker.use(new StaticCacher(kCacheFiles));
worker.use(new SimpleOfflineCache());
worker.init();
