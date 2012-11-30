Evme.Location = new function() {
    var _name = "Location", _this = this,
        $elLocationName = null, $elButton = null, $elSelectorDialog = null, $locationScreen = null,
        $elButtonManual = null,
        dialog = null, dialogActive = false, timeoutLocationRequest = null;
    var lat = "", lon = "", name = "",
        lastUserLat = "", lastUserLon = "";
    
    this.init = function(options) {
        options || (options = {});
        
        Evme.EventHandler.trigger(_name, "init");
    };
    
    this.requestUserLocation = function(onSuccess, onError) {
        var hadError = false,
            reportError = function(data) {
            if (!hadError) {
                hadError = true;
                cbError(data);
                onError && onError(data);
            }
        };
        
        cbLocationRequest();
        
        navigator.geolocation.getCurrentPosition(function(data){
            if (!data || !data.coords) {
                reportError(data);
            } else if (!hadError) {
                onSuccess && onSuccess(data);
                cbLocationSuccess(data);
            }
        }, reportError,
        { timeout: 2000 });
    };
    
    function cbLocationRequest() {
        Evme.EventHandler.trigger(_name, "requesting");
    }
    
    function cbLocationSuccess(data) {
        Evme.EventHandler.trigger(_name, "success", {
            "data": data
        });
    }
    
    function cbError(data) {
        Evme.EventHandler.trigger(_name, "error", data);
    }
};
