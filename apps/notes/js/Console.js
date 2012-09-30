var Console = new function() {
    var _this = this,
        namespace = "", DEBUG = false,
        methods = ["log", "info", "warn", "error", "group", "groupEnd"];
    
    this.init = function(ns) {
        namespace = ns;
        DEBUG = true;
    };
    
    function c(method, args) {
        if (!DEBUG) return;
        Array.prototype.splice.call(args, 0, 0, namespace + ": ");
        console[method].apply(this, args);
    }
    
    for (var i=0; i<methods.length; i++) {
        (function(m) {
            _this[m] = function() { c(m, arguments); };
        })(methods[i]);
    }
};