Evme.Storage = new function Evme_Storage() {
    var self = this, CURRENT_VERSION = "1.4",
        localCache = {},
        isEnabled,
        
        KEY_VALUE = '_v',
        KEY_EXPIRE = '_e',
        KEY_VERSION = '_ver';
        
    this.set = function set(key, val, ttl) {
        self.remove(key, true);
        
        if (val === undefined) { return false; }
        
        var objToSave = {};
        objToSave[KEY_VALUE] = val;
        
        if (ttl) {
            objToSave[KEY_EXPIRE] = Date.now() + ttl*1000;
        }
        
        localCache[key] = objToSave;
        
        try {
            localStorage.setItem(key, JSON.stringify(objToSave));
            
            return true;   
        } catch(ex) {
            err(ex, "save");
            
            return false;
        }
        
        return true;
    };
    this.add = this.set;
    
    this.get = function get(key) {
        if (key) {
            var val = localCache[key];
            
            if (!val) { return null; }
            
            if (val[KEY_EXPIRE] && Date.now() >= val[KEY_EXPIRE]) {
                self.remove(key);
                val = null;
            }
            
            return val && val[KEY_VALUE];
        } else {
            return localCache;
        }
    };
    
    this.remove = function remove(key, bDontUpdate) {
        if (!localCache[key]) { return false; }
        
        delete localCache[key];
        
        if (!bDontUpdate) {
            try {
                localStorage.removeItem(key);
            } catch(ex) {
                
            }
        }
        
        return !bDontUpdate;
    };
    
    this.enabled = function enabled(bForceCheck) {
        if (isEnabled !== undefined && !bForceCheck) {
            return isEnabled;
        }
        
        var key = "__testkey__",
            val = "__testval__";
            
        try {
            if (window.localStorage) {
                localStorage.setItem(key, val);
                isEnabled = localStorage.getItem(key) === val;
            }
        } catch(ex) {
            isEnabled = false;
        }
        
        return isEnabled;
    };
    
    function populate() {
        if (self.enabled()) {
            var version = null,
                now = Date.now();
                
            try {
                version = localStorage.getItem(KEY_VERSION);
            } catch(ex) {}
            
            if (version === CURRENT_VERSION) {
                for (var k in localStorage) {
                    var value = localStorage.getItem(k);
                    
                    if (!value) {
                        continue;
                    }
                    
                    try {
                        var obj = JSON.parse(value);
                        localCache[k] = obj;
                        if (obj[KEY_EXPIRE] && now >= obj[KEY_EXPIRE]){
                            self.remove(k);
                        }
                    } catch(ex) {
                        localCache[k] = value;
                    }
                }
            } else {
                try {
                    localStorage.clear();
                    localStorage.setItem(KEY_VERSION, CURRENT_VERSION);
                } catch(ex) {}
            }
        }
    }
    
    function err(ex, method, key, size) {
        if (typeof ex == "string") {
            ex = {"message": ex};
        }
        var message = "Storage error (" + method + "): " + ex.message;
        if (key) {
            message += ", key: " + key;
        }
        if (size) {
            message += ", size: " + size;
        }
        
        ex.message = message;
        
        ("ErrorHandler" in window) && ErrorHandler.add(ex);
    }
    
    populate();
};