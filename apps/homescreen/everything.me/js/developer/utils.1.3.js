function create(tagName, parent, props, callback, adjacentNode) {
    var doc = parent ? parent.ownerDocument : document;
    var o = doc.createElement(tagName);
    if (props) for (var p in props) {
        if (p == 'style') {
            var styles = props[p];
            for (var s in styles) o.style.setProperty(s, styles[s]);
        } else o[p] = props[p];
    }
    if (callback && tagName == 'script'){
        var loaded = false;
        var loadFunction = function(){
            if (loaded) {
                return;
            }
            loaded=true;
            callback();
        };
        o.onload = loadFunction;
        o.onreadystatechange = function(){
            if (this.readyState == 'loaded'){
                loadFunction();
            }
        };
    }
    if (parent){
        // IE compatibility
        try {
            parent.insertBefore(o, adjacentNode);
        }
        catch(e){
            parent.insertBefore(o);
        }
    }
    return o;
}

function parseQuery() {
    var r = {};
   (location.search || '').replace(/(?:[?&]|^)([^=]+)=([^&]*)/g, function(ig, k, v) {r[k] = v;});
   return r;
}

function proxify(origObj,proxyObj,funkList){
    var replaceFunk = function(org,proxy,fName)
    {
        org[fName] = function()
        {
           return proxy[fName].apply(proxy,arguments);
        };
    };

    for(var v in funkList) {replaceFunk(origObj,proxyObj,funkList[v]);}
}

function unique(a) {
    if (!a) return a;
    var i=a.length, r=[], s={};
    while (i--) {
        var k = a[i];
        if (!s[k]) {
            s[k] = true;
            r.push(k);
        }
    }
    return r;
}

function aug(json1, json2){
    json1 = json1 || {};
    for (var key in json2) json1[key] = json2[key];
    return json1;
}

function addClass(el, newName){
    var curName = el.className;
    newName = curName !== '' ? ' '+newName : newName;
    el.className+= newName
}

function trim(str){
    if (str.trim){
        return str.trim();
    }
    else{
        return str.replace(/^\s+|\s+$/g, '');
    }
}

var Logger = function(){
    function getLoggerLevel(){
    	if (/http:\/\/.+\.(loc)\.flyapps\.me\//.test(location.href) || /http:\/\/loc\.flyapps\.me\//.test(location.href) || /http:\/\/.+test\.flyapps\.me\//.test(location.href)){
            return Log.DEBUG;
        }
        else if (/http:\/\/.+\.(stg|test)\.flyapps\.me\//.test(location.href)){
            return Log.INFO;
        }
        else if (/http:\/\/.+\.flyapps\.me\//.test(location.href) || /http:\/\/everything\.me\//.test(location.href)){
            return Log.ERROR;
        }
        return Log.DEBUG;
    }

    function getLoggerOutput(){
        var loggerOutput = parseQuery()['doatloggeroutput'];
        if (loggerOutput){
            switch (loggerOutput){
                case 'console':
                    return Log.consoleLogger;
                    break;
                case 'inline':
                    return Log.writeLogger;
                    break;
                case 'alert':
                    return Log.alertLogger;
                    break;
                case 'popup':
                    return Log.popupLogger;
                    break;
                default:
                    if (window[loggerOutput]){
                        return window[loggerOutput]
                    }
            }
        }
        return Log.consoleLogger;
    }

    return new Log(getLoggerLevel(), getLoggerOutput());
};

function addListener(){
    if (typeof arguments[0] === 'string'){
        arguments[2] = arguments[1];
        arguments[1] = arguments[0];
        arguments[0] = document;
    }
    var el = arguments[0],
        type = arguments[1],
        cb = arguments[2];

    if (typeof el.addEventListener !== 'undefined'){
      el.addEventListener(type, cb, false);
    }
    else if (el.attachEvent){
      el.attachEvent('on'+type, cb, false);
    }
}

function removeListener(){
    if (typeof arguments[0] === 'string'){
        arguments[2] = arguments[1];
        arguments[1] = arguments[0];
        arguments[0] = document;
    }
    var el = arguments[0],
        type = arguments[1],
        cb = arguments[2];

    if (typeof el.removeEventListener !== 'undefined'){
      el.removeEventListener(type, cb, false);
    }
    else if (el.detachEvent){
      el.detachEvent('on'+type, cb);
    }
}