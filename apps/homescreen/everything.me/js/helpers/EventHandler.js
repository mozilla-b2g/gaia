/*
 * Acts as event manager. Provides bind and trigger functions.
 */
Evme.EventHandler = new function(){
    var arr = {};
    
    var MAIN_EVENT = "DoATEvent";
    
    var bind = function(eventNamesArr, cb){
        !(eventNamesArr instanceof Array) && (eventNamesArr = [eventNamesArr]);
        for (var idx in eventNamesArr){
            var eventName=eventNamesArr[idx];
            !(eventName in arr) && (arr[eventName] = []);
            arr[eventName].push(cb);
        }
    };

    var unbind = function(eventName, cb){
        if (!cb){
            arr[eventName] = {};
        } else {
            for (var a=arr[eventName], i=a?a.length-1:-1; i>=0; --i) {
                if (a[i]===cb) {
                    a.splice(i, 1);
                    return;
                }
            }
        }        
    };

    var trigger = function(eventName, data){
        if (eventName && eventName in arr){
            for (var i=0, a=arr[eventName], len=a.length; i<len; i++) {
                data = Array.prototype.slice.apply(data);
                a[i].apply(this, data);
            }
        }
    };
    
    this.bind = function(cb){
        bind(MAIN_EVENT, cb)
    };
    
    this.unbind = function(cb){
        unbind(MAIN_EVENT, cb)
    };
    
    this.trigger = function(){
        trigger(MAIN_EVENT, arguments);
    }
};