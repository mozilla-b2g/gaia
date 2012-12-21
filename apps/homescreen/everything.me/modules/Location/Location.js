Evme.Location = new function Evme_Location() {
    var NAME = "Location", self = this,
        alertShown = false,
        
        ALERT_MESSAGE = 'Results are always local, so you don\'t have to type your location.' +
                        "\n\n" +
                        'You can manage this location permission from Settings.',
        STORAGE_KEY = 'geo-alert-shown';
    
    this.init = function init(options) {
        options || (options = {});
        
        alertShown = Evme.Storage.get(STORAGE_KEY);
        
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
        
        if (!alertShown) {
            Evme.Storage.set(STORAGE_KEY, true);
            alert(ALERT_MESSAGE);
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
