Evme.Location = new function Evme_Location() {
    var NAME = 'Location', self = this,
        lastUpdateTime = 0,
        requestTimeout = 'FROM CONFIG',
        refreshInterval = 'FROM CONFIG';
    
    this.init = function init(options) {
        options || (options = {});
        
        refreshInterval = options.refreshInterval;
        requestTimeout = options.requestTimeout;
        
        Evme.EventHandler.trigger(NAME, 'init');
    };
    
    this.requestUserLocation = function requestUserLocation() {
        var hadError = false;
        
        // this method prevents double error-reporting
        // in case we get both error and timeout, for example
        function reportError(data) {
            if (!hadError) {
                hadError = true;
                cbError(data);
            }
        }
        
        cbRequest();
        
        navigator.geolocation.getCurrentPosition(function onLocationSuccess(data){
            if (!data || !data.coords) {
                reportError(data);
            } else if (!hadError) {
                cbSuccess(data);
            }
        }, reportError,
        { "timeout": requestTimeout });
    };
    
    this.updateIfNeeded = function updateIfNeeded() {
        if (self.shouldUpdate()) {
            self.requestUserLocation();
            return true;
        }
        return false;
    };
    
    this.shouldUpdate = function shouldUpdate() {
        return Date.now() - lastUpdateTime > refreshInterval;
    };
    
    function cbRequest() {
        Evme.EventHandler.trigger(NAME, "request");
    }
    
    function cbSuccess(data) {
        lastUpdateTime = Date.now();
        
        Evme.EventHandler.trigger(NAME, "success", {
            "position": data
        });
    }
    
    function cbError(data) {
        Evme.EventHandler.trigger(NAME, "error", data);
    }
};