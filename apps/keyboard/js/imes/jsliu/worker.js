importScripts('lib/sql.min.js', 'lib/boshiamy.db.js', 'lib/cloud-liu.js');

self.cliu = new CloudLiu(self);
self.addEventListener('message', function(e) {
  var data = e.data;

  switch (data.cmd) {
  case 'handle_Key':
    var ret = self.cliu.handle_Key(data.value);
    self.postMessage({cmd: 'return', value: ret, keycode: data.value});
    break;
  case 'handle_Escape':
    self.cliu.handle_Escape();
    break;
  }
}, false);
