/*
 *  Module: Console. It is based on HTML5 window.console, WebSockets and
 *  Cross Document messaging
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telefónica I+D S.A.U.
 *
 *  LICENSE: TBD
 *
 *  @author José M. Cantera (jmcf@tid.es)
 *
 *  The module defines three kind of objects: Logger, Appender, Layout
 *
 *  There are three kind of appenders:
 *
 *  owd.logs.ConsoleAppender() writes traces to window.console
 *  owd.logs.WebSocketAppender writes traces to a WebSocket (for remote deb)
 *  owd.logs.DomAppender writes traces to a HTMLDOMElement
 *  owd.logs.CrossDocAppender writes traces to through parent.postMessage
 *
 *
 * @example
 *
 *   var appd = new owd.logs.WebSocketAppender('localhost:8081');
 *   var logger = new owd.logs.Logger('MyLibrary',appd);
 *   logger.log('This is a log message!!');
 *
 *
 *
*/

var owd = window.owd || {};

if(!owd.logs) {
  (function() {
    'use strict';

    if(window.MozWebSocket) {
      window.console.log("Mozilla's WebSocket is present")
      window.WebSocket = window.MozWebSocket;
    }

    var logs = owd.logs = {};

    function extend(subClass,superClass) {
      var F = function() {};

      F.prototype = superClass.prototype;
      subClass.prototype = new F();

      subClass.prototype.constructor = subClass;
    }

    function lineNumber(err) {
      var callerLine = err.stack.split("\n")[1];

      window.console.log(callerLine);

      var idx = callerLine.lastIndexOf('/');

      var str = callerLine.substring(idx + 1, callerLine.length);

      return str;
    }

    // A pointer to the original window.console just in case
    var _console = window.console;

    // Template for an appender
    logs.Appender = function() {
        this.append = function(text,params) {
      };
    };

    /**
     *  This is a ConsoleAppender. Appends everything to the browser console
     *
     */
    var consoleAppd = logs.ConsoleAppender = function() {};
    extend(consoleAppd,logs.Appender);
    consoleAppd.prototype.append = function(text) {
        _console.log(text);
    }

    /**
     *  This is a DomAppender.
     *
     *  Appends all the text as text nodes in a parent element
     *
     *  @param id of the element that will contain the console text
     *
     */
    var domAppd = logs.DomAppender = function(id) {
      var ele = document.querySelector('#' + id);

      this.append = function(text,params) {
        var ntext = document.createTextNode(text);
        var ebreak = document.createElement('br');

        ele.appendChild(ntext);
        ele.appendChild(ebreak);
      };
    };
    extend(domAppd,logs.Appender);

    /**
     *  This a WebSocket Appender
     *
     *  Sends all the text to a WebSocket
     *
     *  @param uri The URI to connect to the WebSocket
     *
     */
    var wsAppd = logs.WebSocketAppender = function(uri) {
      var curi = uri;
      if(uri.indexOf('ws://') === -1) {
        curi = 'ws://' + uri;
      }
      var ws = new window.WebSocket(curi);

      ws.onopen = function() {
        _console.log('WS has been opened');
        // Register as an application
        var obj = {};
        obj.type = 'request'; obj.method = 'register';
        obj.params = {};
        obj.params.type = 'application';
        ws.send(JSON.stringify(obj));
      };

      ws.onerror = function() {
        _console.log('Error!!!');
      };

      ws.onclose = function(e) {
        _console.log('WS has been closed');
      };

      this.append = function(text,params) {
        var val = {};
        val.type = 'trace';
        val.text = text;
        if(params) {
          val.params = params;
        }
        ws.send( JSON.stringify(val) );
      };
    };

    extend(wsAppd,logs.Appender);

    var crossDocAppd = logs.CrossDocAppender = function() {
      this.append = function(text,aparams) {
        var req = { type: 'request', method: 'append', params: {} };
        req.params.text = text;
        req.params.params = aparams;

        parent.postMessage(req,'*');
      };
    };

    extend(crossDocAppd,logs.Appender);

    /**
     *   This is a logger
     *
     *   Allows to put log messages
     *
     */
    logs.Logger = function(name,appender) {
        this.appender = appender;
        this.name = name;

        /**
         *   Composes a log message with different parameters
         *
         */
        function composeMsg(args) {
          var out = '';

          for(var j = 0; j < args.length; j++) {
            out += args[j].toString() + ' ';
          }

          return out;
        }

        /**
         *   Formats the final message to be put on the log
         *
         *
         */
        function formatMsg(args,ln) {
          var prefix = '';
          var txt = composeMsg(args);

          if(name && name.length > 0) {
            prefix = '[' + name + ']';
          }

          prefix += (' ' + ln);

          return prefix + ' ' + txt;
        }

        /**
         *  Log function
         *
         */
        this.log = function() {
          var err = new Error;
          var ln = lineNumber(err);

          appender.append(formatMsg(arguments,ln));
        };

        /**
         *  Info function
         *
         *
         */
        this.info = function() {
          owd.logger.log();
        };

        /**
         *  Error function
         *
         *
         */
        this.error = function() {
          var err = new Error;
          var ln = lineNumber(err);

          appender.append(formatMsg(arguments,ln), {error:true});
        };

        /**
         *  Trace function
         *
         *
         */
        this.trace = function() {
          var err = new Error;

          appender.append('[' + name + '] ' + err.stack);
        };
    }

  })();
}
