Evme.Storage = new function Evme_Storage() {
    var self = this, CURRENT_VERSION = "1.4",
        localCache = {},
        isEnabled,
        
        KEY_PREFIX = 'evme-',
        KEY_VALUE = '_v',
        KEY_EXPIRE = '_e',
        KEY_VERSION = '_ver';
        
    this.set = function set(key, val, ttl, callback) {
      val = {
        "value": val
      };
      
      if (ttl) {
        val.expires = Date.now() + ttl*1000;
      }
      
      asyncStorage.setItem(KEY_PREFIX + key, val, callback);
      
      return true;
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
    
    this.enabled = function enabled(bForceCheck) {
      return true;
    };
};