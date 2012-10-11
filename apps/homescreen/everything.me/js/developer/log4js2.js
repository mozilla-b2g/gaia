/**
 * @fileoverview Javascript Logger (in the spirit of log4j)
 * This library is designed to make the writing and debugging
 * of javascript code easier, by allowing the programmer to perform
 * debug or log output at any place in their code.  This supports
 * the concept of different levels of logging (debug < info < warn < error < fatal << none)
 * as well as different log outputs.  Three log outputs are included, but you can
 * add your own.  The included log outputs are {@link Log#writeLogger},
 * {@link Log#alertLogger}, and {@link Log#popupLogger}.  For debugging on Safari,
 * the log ouput {@link Log#consoleLogger} is also included.  To turn off debugging
 * but still leave the logger calls in your script, use the log level {@link Log#NONE}.
 *
 * Example usage:
 * <pre>
 * &lt;html&gt;
 *  &lt;head&gt;
 *      &lt;script src="log4js.js" type="text/javascript"&gt;&lt;/script&gt;
 *  &lt;/head&gt;
 *  &lt;body&gt;
 *     Log4JS test...&lt;hr/&gt;
 *     &lt;script&gt;
 *        // Setup log objects
 *        //
 *        //  log object of priority debug and the popup logger
 *        var log = new Log(Log.DEBUG, Log.popupLogger);
 *        //  log object of priority warn and the alert logger
 *        var log2 = new Log(Log.WARN, Log.alertLogger);
 *        //  log object of priority debug and the console logger (Safari)
 *        var log3 = new Log(Log.DEBUG, Log.consoleLogger);
 *
 *        log.debug('foo1');     // will popup a new window and log 'foo'
 *        log.warn('bar1');      // will add a new 'bar' message to the popup
 *        log2.debug('foo2');    // will do nothing (Log object's priority threshold is WARN)
 *        log2.warn('bar2');     // will display a javascript alert with the string 'bar'
 *        log3.debug('foo3');    // will log message to Safari console or existing popup
 *        log3.warn('bar3');     // same
 *
 *        log.info(Log.dumpObject(new Array('apple','pear','orange','banana')));
 *     &lt;/script&gt;
 *  &lt;/body&gt;
 * &lt;/html&gt;
 * </pre>
 *
 * @author Marcus R Breese mailto:mbreese@users.sourceforge.net
 * @license Apache License 2.0
 * @version 0.31
 *<pre>
 **************************************************************
 *
 * Copyright 2005 Fourspaces Consulting, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); 
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at 
 *
 * http://www.apache.org/licenses/LICENSE-2.0 
 *
 * Unless required by applicable law or agreed to in writing, software 
 * distributed under the License is distributed on an "AS IS" BASIS, 
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
 * See the License for the specific language governing permissions and 
 * limitations under the License
 *
 **************************************************************
 *
 * Changelog:
 * 0.31 Bug fix (resizeable should be resizable - Darryl Lyons)
 * 0.3  Migrated to SF.net SVN repository - test cleanups
 * 0.2  - Added consoleLogger for Safari
 *      - Changed popupLogger so that it only notifies once (or twice)
 *        that a popup blocker is active.   
 *      - Added Log.NONE level for silencing all logging
 * </pre>
 */



/**
 * Create a new logger
 * @constructor
 * @class The main Log class.  Create a new instance of this class to send all logging events.
 * @param level The cut-off logger level.  You can adjust this level in the constructor and leave all other logging events in place.  Defaults to {@link Log#WARN}.
 * @param logger The logger to use.  The logger is a function that accepts the logging events and informs the user or developer. Defaults to {@link Log#writeLogger}.
 */
function Log(level,logger,prefix) {
       var _currentLevel = Log.WARN;
       var _logger = Log.writeLogger; // default to write Logger
       var _prefix = false;
       this._isMobileBrowser = Log.isMobileBrowser();
       /**
        * Sets the current logger prefix 
        * @param {String} prefix This prefix will be prepended to all messages.
        */
       this.setPrefix = function(pre) {
           if (pre!='undefined') { _prefix = pre; }
       else { _prefix = false; }
       }
       /**
        * Sets the current logger function
        * @param logger The function that will be called when a log event needs to be displayed
        */
       this.setLogger = function(logger) {
           if (logger!='undefined') { _logger = logger; }
           if (logger === Log.writeLogger){
               var loggerWrapper = document.createElement("div");
               loggerWrapper.id = "logger";
               loggerWrapper.style.backgroundColor = "white";
               loggerWrapper.style.position = "fixed";
               loggerWrapper.style.top = "100px";
               loggerWrapper.style.left = "0";
               loggerWrapper.style.zIndex = "20";
               loggerWrapper.style.overflow = "scroll";
               loggerWrapper.style.height = "400px";
               
               document.body.appendChild(loggerWrapper);
               
               var clear = document.createElement("a");
               clear.innerHTML = "clear";
               clear.href = "javascript://";
               clear.addEventListener("click", function(){
                   loggerList.innerHTML = "";
               }, false);
               loggerWrapper.appendChild(clear);
               
               loggerList = document.createElement("ul");
               loggerWrapper.appendChild(loggerList);
           }
       }

       /**
        * Sets the current threshold log level for this Log instance.  Only events that have a priority of this level or greater are logged.
        * @param level The new threshold priority level for logging events.  This can be one of the static members {@link Log#DEBUG},  {@link Log#INFO}, {@link Log#WARN}, {@link Log#ERROR}, {@link Log#FATAL}, {@link Log#NONE}, or it can be one of the strings ["debug", "info", "warn", "error", "fatal", "none"].
        */
       this.setLevel = function(level) { 
           if (level!='undefined' && typeof level =='number') {
                   _currentLevel = level;
           } else if (level!='undefined') {
                   if (level=='debug') { _currentLevel = Log.DEBUG; }
                   else if (level=='info') { _currentLevel = Log.INFO; }
                   else if (level=='error') { _currentLevel = Log.ERROR; }
                   else if (level=='fatal') { _currentLevel = Log.FATAL; }
                   else if (level=='warn') { _currentLevel = Log.WARN; }
                   else { _currentLevel = Log.NONE; }
           }
       }

       /**
        * Gets the current prefix
    * @return current prefix
    */
       
       this.getPrefix = function() { return _prefix; }

       /**
        * Gets the current event logger function
    * @return current logger
    */
       
       this.getLogger = function() { return _logger; }

       /**
        * Gets the current threshold priority level
    * @return current level
    */
       
       this.getLevel = function() { return _currentLevel; }
       
       if (level!='undefined') { this.setLevel(level); }
       if (logger!='undefined') { this.setLogger(logger); }
       if (prefix!='undefined') { this.setPrefix(prefix); }
}
/**
 * Log an event with priority of "debug"
 * @param s the log message
 */
Log.prototype.debug     = function() { if (this.getLevel()<=Log.DEBUG) { this._log("DEBUG",this, arguments); } }
/**
 * Log an event with priority of "info"
 * @param s the log message
 */
Log.prototype.info      = function() { if (this.getLevel()<=Log.INFO ) { this._log("INFO",this, arguments); } }
/**
 * Log an event with priority of "warn"
 * @param s the log message
 */
Log.prototype.warn      = function() { if (this.getLevel()<=Log.WARN ) { this._log("WARN",this, arguments); } }
/**
 * Log an event with priority of "error"
 * @param s the log message
 */
Log.prototype.error     = function() { if (this.getLevel()<=Log.ERROR) { this._log("ERROR",this, arguments); } }
/**
 * Log an event with priority of "fatal" 
 * @param s the log message
 */
Log.prototype.fatal     = function() { if (this.getLevel()<=Log.FATAL) { this._log("FATAL",this, arguments); } }

/**
 * _log is the function that actually calling the configured logger function.
 * It is possible that this function could be extended to allow for more
 * than one logger.
 * 
 * This method is used by {@link Log#debug}, {@link Log#info}, {@link Log#warn}, {@link Log#error}, and {@link Log#fatal}
 * @private
 * @param {String} msg The message to display
 * @param level The priority level of this log event
 * @param {Log} obj The originating {@link Log} object.
 */
Log.prototype._log = function(level,obj,msgObj) {
    // INFO: 2010-12-26 14:11:42,690 in User::resetDailyVotes() (User.php:850): Reset Daily Votes for 0 Use
    var date = new Date();
    var d = "";
    d += ((date.getHours() < 10)? "0" + date.getHours() : date.getHours());
    d += ":" + ((date.getMinutes() < 10)? "0" + date.getMinutes() : date.getMinutes());
    d += ":" + ((date.getSeconds() < 10)? "0" + date.getSeconds() : date.getSeconds());
    d += "." + ((date.getMilliseconds() < 100)? ((date.getMilliseconds() < 10)? "00" + date.getMilliseconds() : "0" + date.getMilliseconds()) : date.getMilliseconds());
    
    var msgArr = [], dateStr = '('+d+')';
    if (this._isMobileBrowser){
        var msgStr = dateStr+" ";
        for (var i=0, len=msgObj.length; i<len; i++){ msgStr+= " "+msgObj[i] }
        msgArr = [msgStr];
    }
    else{
        msgArr = ['('+d+')'];
        for (i in msgObj){ msgArr.push(msgObj[i]); }
    }
    
    this.getLogger()(level,obj,msgArr);
}

Log.DEBUG       = 1;
Log.INFO        = 2;
Log.WARN        = 3;
Log.ERROR       = 4;
Log.FATAL       = 5;
Log.NONE        = 6;
CONSOLE_ENABLED = false;

/**
 * Static alert logger method.  This logger will display a javascript alert (messagebox) with the message.
 * @param {String} msg The message to display
 * @param level The priority level of this log event
 */
Log.alertLogger = function(level,obj,msgArr) { alert(level+" - "+msgArr.join(' ')); }
/**
 * Static write logger method.  This logger will print the message out to the web page using document.writeln.
 * @param {String} msg The message to display
 * @param level The priority level of this log event
 */
Log.writeLogger = function(level,obj,msgArr) { 
    var li = document.createElement("li");
    li.innerHTML = level+"&nbsp;:&nbsp;"+msgArr.join(' ');
    var firstLi = loggerList.getElementsByTagName("li")[0];
    loggerList.insertBefore(li, firstLi);
}


/**
 * Static Safari WebKit console logger method. This logger will write messages to the Safari javascript console, if available.
 * If this browser doesn't have a javascript console (IE/Moz), then it degrades gracefully to {@link Log#popupLogger}
 * @param {String} msg The message to display
 * @param level The priority level of this log event
 * @param {Log} obj The originating {@link Log} object.
 */
Log.consoleLogger = function(level,obj,msgArr) {
    if (!CONSOLE_ENABLED) return;
    
    if (window.console) {
        try{
            window.console[level.toLowerCase()].apply(window.console, msgArr);
        }
        catch(err){
            try{
                window.console[level.toLowerCase()](msgArr);
            }
            catch(err){
                window.console.log(level+":"+msgArr);
            }
        }
        
    } /*else {
        Log.popupLogger(msg,level,obj);
    }*/
}
 

/**
 * Static popup logger method.  This logger will popup a new window (if necessary), and add the log message to the end of a list.
 * @param {String} msg The message to display
 * @param level The priority level of this log event
 * @param {Log} obj The originating {@link Log} object.
 */
Log.popupLogger = function(level,obj,msgArr) {
    var msg = msgArr.join(' ');
       if (obj.popupBlocker) {
    return;
       }
       if (!obj._window || !obj._window.document) {
               obj._window = window.open("",'logger_popup_window','width=420,height=320,scrollbars=1,status=0,toolbars=0,resizable=1');
               if (!obj._window) { obj.popupBlocker=true; alert("You have a popup window manager blocking the log4js log popup display.\n\nThis must be disabled to properly see logged events."); return; }
           if (!obj._window.document.getElementById('loggerTable')) {
                       obj._window.document.writeln("<table width='100%' id='loggerTable'><tr><th align='left'>Level</th><th width='100%' colspan='2' align='left'>Message</th></tr></table>");
                       obj._window.document.close();
               }
       }
       var tbl = obj._window.document.getElementById("loggerTable");
       var row = tbl.insertRow(-1);

       //var cell_1 = row.insertCell(-1);
       var cell_2 = row.insertCell(-1);
       var cell_3 = row.insertCell(-1);

       /*var d = new Date();
       var h = d.getHours();
       if (h<10) { h="0"+h; }
       var m = d.getMinutes();
       if (m<10) { m="0"+m; }
       var s = d.getSeconds();
       if (s<10) { s="0"+s; }
       var date = (d.getMonth()+1)+"/"+d.getDate()+"/"+d.getFullYear()+"&nbsp;-&nbsp;"+h+":"+m+":"+s;*/

       /*cell_1.style.fontSize="8pt";
       cell_1.style.fontWeight="bold";
       cell_1.style.paddingRight="6px";*/
       
       cell_2.style.fontSize="8pt";
       
       cell_3.style.fontSize="8pt";
       cell_3.style.whiteSpace="nowrap";
       cell_3.style.width="100%";

       if (tbl.rows.length % 2 == 0) {
        //cell_1.style.backgroundColor="#eeeeee";
        cell_2.style.backgroundColor="#eeeeee";
        cell_3.style.backgroundColor="#eeeeee";
       }
       
       //cell_1.innerHTML=date
       cell_2.innerHTML=level;
       cell_3.innerHTML=msg;
}

/**
 * This method is a utility function that takes an object and creates a string representation of it's members.
 * @param {Object} the Object that you'd like to see
 * @return {String} a String representation of the object passed
 */
Log.dumpObject=function (obj,indent) {
    if (!indent) { indent="";}
    if (indent.length>20) { return ; } // don't go too far...
    var s="{\n";
        for (var p in obj) {
            s+=indent+p+":";
            var type=typeof(obj[p]);
            type=type.toLowerCase();
            if (type=='object') {
                s+= Log.dumpObject(obj[p],indent+"----");
            } else {
                s+= obj[p];
            }
            s+="\n";
        }
        s+=indent+"}";
        return s;
}
Log.isMobileBrowser=function (uaStr) {
    !uaStr && (uaStr = navigator.userAgent);
    uaStr = uaStr.toLowerCase();
    var m = /(iphone|ipad|android|symbian|webos|windows phone os)/.exec(uaStr) || [];
    return m[1];
}
