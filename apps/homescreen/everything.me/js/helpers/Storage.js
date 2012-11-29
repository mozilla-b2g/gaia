Evme.Storage = new function() {
    var _this = this, CURRENT_VERSION = "1.4",
        _valueKey = "_v",
        _expirationKey = "_e",
        _versionKey = "_ver",
        _cache = {};
        
    this.set = function(key, val, ttl) {
        _this.remove(key, true);
        
        if (val === undefined) { return false; }
        
        var objToSave = {};
        objToSave[_valueKey] = val;
        
        if (ttl) {
            objToSave[_expirationKey] = new Date().getTime() + ttl*1000;
        }
        
        _cache[key] = objToSave;
        
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
    
    this.get = function(key) {
        if (key) {
            var val = _cache[key];
            
            if (!val) { return null; }
            
            if (val[_expirationKey]) {
                if (new Date().getTime() >= val[_expirationKey]) {
                    _this.remove(key);
                    val = null;
                }
            }
            
            return val && val[_valueKey];
        } else {
            return _cache;
        }
    };
    
    this.remove = function(key, bDontUpdate) {
        if (!_cache[key]) { return false; }
        
        delete _cache[key];
        
        if (!bDontUpdate) {
            try {
                localStorage.removeItem(key);
            } catch(ex) {
                
            }
        }
        
        return !bDontUpdate;
    };
    
    this.enabled = function() {
        var enabled = false;
        
        try {
            if (!("localStorage" in window) || !window["localStorage"]) {
                return false;
            }
            
            var key = "__testkey__",
                val = "__testval__";
                
            localStorage.setItem(key, val);
            
            enabled = localStorage.getItem(key) == val;
        } catch(ex) {
            enabled = false;
        }
        
        return enabled;
    };
    
    function populate() {
        if (_this.enabled()) {
            var version = null;
            try {
                version = localStorage.getItem(_versionKey);
            } catch(ex) {}
            
            if (version == CURRENT_VERSION) {
                var now = new Date().getTime();
                
                for (var k in localStorage) {
                    var value = localStorage.getItem(k);
                    
                    if (!value) {
                        continue;
                    }
                    
                    try {
                        _cache[k] = JSON.parse(value);
                        if (_cache[k][_expirationKey] && now >= _cache[k][_expirationKey]){
                            _this.remove(k);
                        }
                    } catch(ex) {
                        _cache[k] = value;
                    }
                }
            } else {
                try {
                    localStorage.clear();
                    localStorage.setItem(_versionKey, CURRENT_VERSION);
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