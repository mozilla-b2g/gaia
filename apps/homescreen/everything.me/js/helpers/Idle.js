/*
 * Idle class
 * Triggers a callback after a specified amout of time gone idle
 */
Evme.Idle = function(){
    var _this = this,
        timer, delay, callback;
    
    this.isIdle = true;
    
    // init
    this.init = function(options){
        // set params
        delay = options.delay;
        callback = options.callback;
        
        // start timer
        _this.reset();
    };
    
    // reset timer
    this.reset = function(_delay){
        // set timeout delay value
        if (_delay === undefined){
            _delay = delay;
        }
        
        _this.isIdle = false;
        
        // stop previous timer
        clearTimeout(timer);
        
        // start a new timer
        timer = setTimeout(onIdle, _delay);
    };
    
    this.advanceBy = function(ms){
        _this.reset(delay-ms);
    };
    
    this.flush = function(){
        _this.reset(0);
    };
    
    function onIdle(){
        _this.isIdle = true;
        
        // call callback
        callback();
    }
};
