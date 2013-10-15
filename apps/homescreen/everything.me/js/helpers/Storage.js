Evme.Storage = new function Evme_Storage() {
  var self = this,
    KEY_PREFIX = 'evme-';

  this.set = function set(key, val, ttl, callback) {
    val = {
      'value': val
    };

    if (ttl) {
    if (ttl instanceof Function) {
      callback = ttl;
    } else {
      val.expires = Date.now() + ttl * 1000;
    }
    }

    asyncStorage.setItem(KEY_PREFIX + key, val, callback);
  };

  this.get = function get(key, callback) {
    asyncStorage.getItem(KEY_PREFIX + key, function onItemGot(value) {
    if (value && value.expires && value.expires < Date.now()) {
      self.remove(key);
      value = null;
    }

    // value.value since the value is an object {"value": , "expires": }
    value = value && value.value;

    callback && callback(value);
    });
  };

  this.remove = function remove(key, callback) {
    asyncStorage.removeItem(KEY_PREFIX + key, callback);
  };

  // legacy compatibility from localStorage
  this.enabled = function enabled() {
    return true;
  };
}
