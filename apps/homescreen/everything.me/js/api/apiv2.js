Evme.api = new function Evme_api() {
    var self = this,
        API_VERSION = 'FROM CONFIG',
        API_HOST = 'FROM CONFIG',
        BASE_URL = '/everything/';
    
    this.init = function init(options) {
        API_HOST = options.host;
        API_VERSION = options.version;
        
        BASE_URL = 'https://' + API_HOST + BASE_URL + API_VERSION + '/';
    };
    
    this.getHost = function getHost() {
        return API_HOST;
    };
    
    this.App = {
        close: function close(options, callback) {
            return request("App/close", options, callback);
        },
        icons: function icons(options, callback) {
            return request("App/icons", options, callback);
        }
    };
    
    this.Device = {
        update: function update(options, callback) {
            return request("Device/update", options, callback);
        }
    };
    
    this.Location = {
        search: function search(options, callback) {
            return request("Location/search", options, callback);
        },
        set: function set(options, callback) {
            return request("Location/set", options, callback);
        }
    };
    
    this.Logger = {
        error: function error(options, callback) {
            return request("Logger/error", options, callback);
        },
        info: function info(options, callback) {
            return request("Logger/info", options, callback);
        },
        warn: function warn(options, callback) {
            return request("Logger/warn", options, callback);
        }
    };
    
    this.Search = {
        apps: function apps(options, callback) {
            return request("Search/apps", options, callback);
        },
        suggestions: function suggestions(options, callback) {
            return request("Search/suggestions", options, callback);
        },
        external: function external(options, callback) {
            return request("Search/external", options, callback);
        },
        bgimage: function bgimage(options, callback) {
            return request("Search/bgimage", options, callback);
        },
        trending: function trending(options, callback) {
            return request("Search/trending", options, callback);
        },
        disambiguate: function disambiguate(options, callback) {
            return request("Search/disambiguate", options, callback);
        }
    };
    
    this.Session = {
        init: function init(options, callback) {
            return request("Session/init", options, callback, false);
        }
    };
    
    this.Shortcuts = {
        get: function get(options, callback) {
            return request("Shortcuts/get", options, callback);
        },
        set: function set(options, callback) {
            return request("Shortcuts/set", options, callback);
        },
        suggestions: function suggestions(options, callback) {
            return request("Shortcuts/suggestions", options, callback);
        }
    };
    
    this.User = {
        apps: function apps(options, callback) {
            return request("User/apps", options, callback);
        },
        clearApps: function clearApps(options, callback) {
            return request("User/clearApps", options, callback);
        }
    };
    
    this.Stats = {
        report: function report(options, callback) {
            return request("Stats/report", options, callback);
        }
    };
    
    function request(method, options, callback) {
        var url = BASE_URL + method,
            params = "",
            httpRequest = new XMLHttpRequest();
        
        if (options) {
            for (var k in options) {
                if (typeof options[k] !== "undefined") {
                    params += k + "=" + encodeURIComponent(options[k]) + "&";
                }
            }
        }
        
        httpRequest.open('POST', url, true);
        httpRequest.responseType = 'json';
        httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        httpRequest.onreadystatechange = function onReadyStateChange(e) {
            if (httpRequest.readyState === 4) {
                callback(httpRequest.response, url + '?' + params);
            }
        };
        httpRequest.withCredentials = true;
        httpRequest.send(params);
        
        return httpRequest;
    }
}