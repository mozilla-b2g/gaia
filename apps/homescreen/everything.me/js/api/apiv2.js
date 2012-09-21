Evme.api = new function() {
    var _this = this;
    var DEFAULT_API_HOST = "api.everything.me";
    var API_VERSION = "2.1";
    var API_HOST = DEFAULT_API_HOST;
    var BASE_URL = "/everything/" + API_VERSION + "/";
    var USE_POST = true;
    
    var Methods = {
        "JSONP": 1,
        "POST": 2,
        "WebSockets": 3
    };
    var requestMethod = Methods.JSONP;
    
    this.Methods = Methods;
    
    this.init = function(_method) {
        if (_method && Methods[_method]) {
            requestMethod = _method;
        } else {
            requestMethod = Methods.JSONP;
            if (XMLHttpRequest.prototype.hasOwnProperty("withCredentials")) {
                requestMethod = Methods.POST;
            } else {
                try {
                    var request = new XMLHttpRequest();
                    if ("withCredentials" in request) {
                        requestMethod = Methods.POST;
                    }
                } catch(ex) {
                    
                }
            }
        }
    };
    _this.init();
    
    this.setHost = function(hostName) {
        if (hostName) {
            API_HOST = hostName;
        }
    };
    
    this.getHost = function() {
        return API_HOST;
    };
    
    this.App = new function() {
        this.close = function(options, callback) {
            return request("App/close", options, callback);
        };
        this.icons = function(options, callback) {
            return request("App/icons", options, callback);
        };
    };
    
    this.Device = new function() {
        this.update = function(options, callback) {
            return request("Device/update", options, callback);
        };
    };
    
    this.Location = new function() {
        this.search = function(options, callback) {
            return request("Location/search", options, callback);
        };
        this.set = function(options, callback) {
            return request("Location/set", options, callback);
        };
    };
    
    this.Logger = new function() {
        this.error = function(options, callback) {
            return request("Logger/error", options, callback);
        };
        this.info = function(options, callback) {
            return request("Logger/info", options, callback);
        };
        this.warn = function(options, callback) {
            return request("Logger/warn", options, callback);
        };
    };
    
    this.Search = new function() {
        this.apps = function(options, callback) {
            return request("Search/apps", options, callback);
        };
        this.suggestions = function(options, callback) {
            return request("Search/suggestions", options, callback);
        };
        this.external = function(options, callback) {
            return request("Search/external", options, callback);
        };
        this.bgimage = function(options, callback) {
            return request("Search/bgimage", options, callback);
        };
        this.trending = function(options, callback) {
            return request("Search/trending", options, callback);
        };
        this.disambiguate = function(options, callback) {
            return request("Search/disambiguate", options, callback);
        };
    };
    
    this.Session = new function() {
        this.init = function(options, callback) {
            return request("Session/init", options, callback, false);
        };
    };
    
    this.Shortcuts = new function() {
        this.get = function(options, callback) {
            return request("Shortcuts/get", options, callback);
        };
        this.set = function(options, callback) {
            return request("Shortcuts/set", options, callback);
        };
        this.suggestions = function(options, callback) {
            return request("Shortcuts/suggestions", options, callback);
        };
    };
    
    this.User = new function() {
        this.apps = function(options, callback) {
            return request("User/apps", options, callback);
        };
        this.clearApps = function(options, callback) {
            return request("User/clearApps", options, callback);
        };
    };
    
    this.Stats = new function() {
        this.report = function(options, callback) {
            return request("Stats/report", options, callback);
        };
    };
    
    function request(method, options, callback, isSecured) {
        !options && (options = {});
        var protocol = (isSecured)? "https" : "http"; 
        var url = protocol + "://" + API_HOST + BASE_URL + method;
        var params = "";
        
        for (var k in options) {
            if (typeof options[k] !== "undefined") {
                params += k + "=" + encodeURIComponent(options[k]) + "&";
            }
        }
        
        if (requestMethod == Methods.POST) {
            var request = new XMLHttpRequest();
            request.open("POST", url, true);
            request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            request.onreadystatechange = function(e) {
                if (request.readyState == 4) {
                    var response = null;
                    try {
                        response = JSON.parse(request.responseText);
                    } catch(ex){}
                    
                    if (response) {
                        callback(response, url + "?" + params);
                    }
                }
            };
            request.withCredentials = true;
            request.send(params);
            
            return request;
        } else {
            url += "?" + params + "&callback=?";
            
            return $.getJSON(url, function(data){
                callback(data, url);
            });
        }
    }
}