/* jshint worker:true, -W097 */

'use strict';

importScripts('/lib/sww.js');

const worker = new self.ServiceWorkerWare();

worker.use(new self.SimpleOfflineCache());

worker.init();
