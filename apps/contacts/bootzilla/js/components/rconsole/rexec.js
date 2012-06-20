/*
 *  Module: Remote Executor based on Web Sockets
 *
 *  The module needs a Web Socket server somewhere
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telefónica I+D S.A.U.
 *
 *  LICENSE: TBD
 *
 *  @author José M. Cantera (jmcf@tid.es)
 *
 *  @example
 *
 *  owd.rexec.init('localhost:8081');
 *
 *  from that moment on the page will be ready to execute code
 *
 *  THIS MODULE MUST BE USED ONLY IN DEBUGGING ENVIRONMENTS
 *
 *  PLEASE DO NOT USE IT IN PRODUCTION AS IT OPENS A SEC HOLE
 *
 *
*/

var owd = window.owd || {};

if(!owd.rexec) {
  (function() {
    'use strict';

    var rexec = owd.rexec = {};

    var ws;

    // We control if the prefixed implementation is there
    if(window.MozWebSocket) {
      window.console.log("Mozilla's WebSocket is present")
      window.WebSocket = window.MozWebSocket;
    }

    /**
     *  Executed when new data arrives on the Web Socket
     *
     *  @param d the data in String format
     *
     *  @private
     *
     *
     */
    function ondatareceived(d) {
      var obj = JSON.parse(d);

      if(obj.type === 'request' && obj.method === 'eval') {
        var expression = obj.params.expression;

        window.console.log(expression);

        window.setTimeout(function() {
          var res = eval(expression); window.console.log('Result: ' + res);
          oneval(res);
        },0);
      }
    }

    /**
     *   When a piece of Javascript code has been executed notifies
     *   through the WebSocket
     *
     *   @param res the result of the evaluation
     *
     *   @private
     *
     *
     */
    function oneval(res) {
      // Once this has been evaluated the response will be sent
      var obj = {};
      obj.type = 'response';
      obj.method = 'eval'; obj.params = {};
      obj.params.result = res;

      ws.send(JSON.stringify(obj));
    }

    /**
     *   Init function Opens up a Web Socket to the specified address
     *   and starts listening for request for data evaluation
     *
     *    @param addr a Web socket address to connect to in order to start
     *    listening to the requests for evaluation
     *
     */
    rexec.init = function(addr) {
      var taddr = addr;

      var WS_SCHEME = 'ws://';

      if(addr && addr.length > 0) {
        if(addr.indexOf(WS_SCHEME) === -1) {
          taddr = WS_SCHEME + addr;
        }
        ws = new WebSocket(taddr);

        ws.onopen = function() {
            window.console.log('WS has been opened');

            // Register the page as an application page
            window.setTimeout(function() {
                              var obj = {};
                              obj.type = 'request';
                              obj.method = 'register'; obj.params = {};
                              obj.params.type = 'application';

                              ws.send(JSON.stringify(obj));
            },0);
        };

        ws.onerror = function() {
            window.console.log('Error!!!');
        };

        ws.onclose = function(e) {
            window.console.log('WS has been closed');
        };

        ws.onmessage = function(e) {
            window.console.log('Data received');

            ondatareceived(e.data);
        };
      }
    };
  }() );  // Auto-Exec
}
