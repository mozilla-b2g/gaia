Evme.Location = new function Evme_Location() {
    var NAME = "Location", self = this;
    
    this.init = function init(options) {
        options || (options = {});
        
        Evme.EventHandler.trigger(NAME, "init");
    };
    
    this.requestUserLocation = function requestUserLocation(onSuccess, onError) {
        var hadError = false;
        
        function reportError(data) {
            if (!hadError) {
                hadError = true;
                cbError(data);
                onError && onError(data);
            }
        }
        
        cbLocationRequest();
        
        navigator.geolocation.getCurrentPosition(function onLocationSuccess(data){
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
        Evme.EventHandler.trigger(NAME, "requesting");
    }
    
    function cbLocationSuccess(data) {
        Evme.EventHandler.trigger(NAME, "success", {
            "data": data
        });
    }
    
    function cbError(data) {
        Evme.EventHandler.trigger(NAME, "error", data);
    }
};
