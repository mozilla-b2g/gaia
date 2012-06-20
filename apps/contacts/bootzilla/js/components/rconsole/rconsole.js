/*
 *  Module: Console. It is based on HTML5 window.console
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telef—nica I+D S.A.U.
 *
 *  LICENSE: TBD
 *
 *  @author JosŽ M. Cantera (jmcf@tid.es)
 *
 *  This module supports the Remote Console App on the browser
 *
 *
 *
*/

var owd = window.owd || {};

if(!owd.rconsole) {
  (function() {
    'use strict';

    var rconsole = owd.rconsole = {};

    // DOM convenience method
    function ele(id) {
      return document.getElementById(id);
    }

    // WebSocket
    var ws;
    // Output node on the DOM
    var output = ele('content');

    // The filter by device. Index is the index of the CSS rule that filters out
    var filterByDevice = {str: '', index: -1};
    // The filter by component
    var filterByComponent = {str: '', index: -1};

    // We control if the prefixed implementation is there
    if(window.MozWebSocket) {
      window.console.log("Mozilla's WebSocket is present")
      window.WebSocket = window.MozWebSocket;
    }

    /**
     * Closes the connection to the Web Socket
     *
     *
     */
    rconsole.disconnect = function() {
      window.console.log('About to closing the connection');
      ws.close();
    };

    /**
     *   Extracts the device from a log message
     *
     *
     */
    function getDevice(data) {
      return data.remote;
    }

    /**
     *  Extracts the component from a log msg
     *
     *
     */
    function getComponent(data) {
      var ret = null;

      var idx1 = data.indexOf('[');
      var idx2 = data.indexOf(']');

      if(idx1 !== -1) {
        ret = data.substring(idx1 + 1,idx2);
      }

      window.console.log('Component: ' + ret);

      return ret;
    }

    /**
     *   Converts an IP address to a string ready to be put on a style
     *
     */
    function convertDevice(ipaddr) {
      var regexp = /\./g;

      var ret = ipaddr.replace(regexp,'-');

      return ret;
    }

    /**
     *
     *  Performs the actual filtering
     *
     */
    rconsole.filter = function() {
      var fdevice = ele('fdevice').value;
      var fcomponent = ele('fcomponent').value;

      unFilterComponent();
      unFilterDevice();

      if(fdevice && fdevice.length > 0) {
        filterByDevice.str = fdevice;
        filterByDevice.index = doFilter('d-' + convertDevice(fdevice));
      }

      if(fcomponent && fcomponent.length > 0) {
        filterByComponent.str = fcomponent;
        filterByComponent.index = doFilter(fcomponent);
      }
    }

    /**
     *  Unfilters by device
     *
     *
     */
    function unFilterDevice() {
      if(filterByDevice.index !== -1) {
        var styleSheet = document.styleSheets[0];

        styleSheet.deleteRule(filterByDevice.index);

        filterByDevice.str = '';
        filterByDevice.index = -1;
      }
    }

    /**
     *   Unfilters by component
     *
     */
    function unFilterComponent() {
      if(filterByComponent.index !== -1) {
        var styleSheet = document.styleSheets[0];

        styleSheet.deleteRule(filterByComponent.index);

        filterByComponent.str = '';
        filterByComponent.index = -1;
      }
    }

    /**
     *   Does the actual filtering by adding CSS rules to the DOM
     *
     *   @param str the filter to be applied
     *
     *
     */
    function doFilter(str) {
      var styleSheet = document.styleSheets[0];

      var cssRuleList = styleSheet.cssRules;
      var rulesLength = cssRuleList.length;

      var cssText = 'p:not(' + '.' + str + ')' + ' { display: none }';

      var ret = styleSheet.insertRule (cssText, rulesLength);

      return ret;
    }

    /**
     *  When new data arrives is in charge of adding it to the console
     *
     *
     */
    function ondatareceived(d) {
      window.console.log(d);

      var obj;
      var text;

      try {
        obj = JSON.parse(d);
      }
      catch(e) { window.console.log('Exception!!!'); text = d; }

      if(obj.type === 'trace') {
        text = obj.data.text;
      }
      else if(obj.type === 'notification') {
          text = obj.data;
      }
      else if(obj.type === 'response' && obj.method === 'eval') {
        text = obj.params.result;
      }

      var ntext = document.createElement('p');
      ntext.textContent = '<' + getDevice(obj) +  '>' + ' ' + text;
      var component = getComponent(text);
      if(component) {
        ntext.classList.add(component);
      }

      ntext.classList.add('d-' + convertDevice(getDevice(obj)));

      window.console.log(obj.params);
      if(obj.data && obj.data.params && obj.data.params.error === true) {
        ntext.classList.add('error');
      }

      output.appendChild(ntext);
    }

    rconsole.clear = function() {
      output.innerHTML = '';
    };

    /**
     *  Requests the Remote Execution of an expression
     *
     */
    rconsole.rexec = function() {
      var obj = {};

      obj.type = 'request';
      obj.method = 'eval'; obj.params = {};

      var expression = document.querySelector('#expression').value;

      obj.params.expression = expression;

      ws.send(JSON.stringify(obj));
    };

    /**
     *  Sets up the Web Socket to receive data
     *
     */
    rconsole.setupWS = function () {
      var addr = ele('address').value;
      var taddr = addr;

      var WS_SCHEME = 'ws://';

      if(addr && addr.length > 0) {
        if(addr.indexOf(WS_SCHEME) === -1) {
          taddr = WS_SCHEME + addr;
        }
        ws = new WebSocket(taddr);

        ws.onopen = function() {
            window.console.log('WS has been opened');

            var obj = {};
            obj.type = 'request';
            obj.method = 'register'; obj.params = {};
            obj.params.type = 'console';

            ws.send(JSON.stringify(obj));
        };

        ws.onerror = function() {
            window.console.log('Error!!!');
        };

        ws.onclose = function(e) {
            window.console.log('WS has been closed');
            output.innerHTML = '';
        };

        ws.onmessage = function(e) {
            window.console.log('Data received');

            ondatareceived(e.data);
        };
      }
    };
  }() );
}
