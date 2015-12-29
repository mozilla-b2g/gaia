/* Copyright (c) 2012 Opera Software ASA
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
!(function( global, undefined ) {

// *** rsvp.js (https://github.com/tildeio/rsvp.js)

  (function(exports) { "use strict";

    var MutationObserver = global.MutationObserver || global.WebKitMutationObserver;
    var async;

    if (typeof process !== 'undefined') {
      async = function(callback, binding) {
        process.nextTick(function() {
          callback.call(binding);
        });
      };
    } else if (MutationObserver) {
      var queue = [];

      var observer = new MutationObserver(function() {
        var toProcess = queue.slice();
        queue = [];

        toProcess.forEach(function(tuple) {
          var callback = tuple[0], binding = tuple[1];
          callback.call(binding);
        });
      });

      var element = global.document.createElement('div');
      observer.observe(element, { attributes: true });

      async = function(callback, binding) {
        queue.push([callback, binding]);
        element.setAttribute('drainQueue', 'drainQueue');
      };
    } else {
      async = function(callback, binding) {
        global.setTimeout(function() {
          callback.call(binding);
        }, 1);
      };
    }

    exports.async = async;

    var Event = exports.Event = function(type, options) {
      this.type = type;

      for (var option in options) {
        if (!options.hasOwnProperty(option)) { continue; }

        this[option] = options[option];
      }
    };

    var indexOf = function(callbacks, callback) {
      for (var i=0, l=callbacks.length; i<l; i++) {
        if (callbacks[i][0] === callback) { return i; }
      }

      return -1;
    };

    var callbacksFor = function(object) {
      var callbacks = object._promiseCallbacks;

      if (!callbacks) {
        callbacks = object._promiseCallbacks = {};
      }

      return callbacks;
    };

    var EventTarget = exports.EventTarget = {
      mixin: function(object) {
        object.on = this.on;
        object.off = this.off;
        object.trigger = this.trigger;
        return object;
      },

      on: function(eventName, callback, binding) {
        var allCallbacks = callbacksFor(this), callbacks;
        binding = binding || this;

        callbacks = allCallbacks[eventName];

        if (!callbacks) {
          callbacks = allCallbacks[eventName] = [];
        }

        if (indexOf(callbacks, callback) === -1) {
          callbacks.push([callback, binding]);
        }
      },

      off: function(eventName, callback) {
        var allCallbacks = callbacksFor(this), callbacks;

        if (!callback) {
          allCallbacks[eventName] = [];
          return;
        }

        callbacks = allCallbacks[eventName];

        var index = indexOf(callbacks, callback);

        if (index !== -1) { callbacks.splice(index, 1); }
      },

      trigger: function(eventName, options) {
        var allCallbacks = callbacksFor(this),
            callbacks, callbackTuple, callback, binding, event;

        if (callbacks = allCallbacks[eventName]) {
          for (var i=0, l=callbacks.length; i<l; i++) {
            callbackTuple = callbacks[i];
            callback = callbackTuple[0];
            binding = callbackTuple[1];

            if (typeof options !== 'object') {
              options = { detail: options };
            }

            event = new Event(eventName, options);
            callback.call(binding, event);
          }
        }
      }
    };

    var Promise = exports.Promise = function(binding) {
      this.binding = binding || this;
      
      this.on('promise:resolved', function(event) {
        this.trigger('success', { detail: event.detail });
      }, this);

      this.on('promise:failed', function(event) {
        this.trigger('error', { detail: event.detail });
      }, this);
    };  

    var noop = function() {};

    var invokeCallback = function(type, promise, callback, event) {
      var value, error;

      if (callback) {
        try {
          value = callback.call(promise.binding, event.detail);
        } catch(e) {
          error = e;
        }
      } else {
        value = event.detail;
      }

      if (value instanceof Promise) {
        value.then(function(value) {
          promise.resolve( value );
        }, function(error) {
          promise.reject( error );
        });
      } else if (callback && value) {
        promise.resolve(value);
      } else if (error) {
        promise.reject(error);
      } else {
        promise[type](value);
      }
    };

    Promise.prototype = {
      then: function(done, fail) {
        var thenPromise = new Promise(this.binding);

        this.on('promise:resolved', function(event) {
          invokeCallback('resolve', thenPromise, done, event);
        });

        this.on('promise:failed', function(event) {
          invokeCallback('reject', thenPromise, fail, event);
        });

        return thenPromise;
      },

      resolve: function(value) {
        exports.async(function() {
          this.trigger('promise:resolved', { detail: value });
          this.isResolved = value;
        }, this);

        this.resolve = noop;
        this.reject = noop;
      },

      reject: function(value) {
        exports.async(function() {
          this.trigger('promise:failed', { detail: value });
          this.isRejected = value;
        }, this);

        this.resolve = noop;
        this.reject = noop;
      }
    };

    EventTarget.mixin(Promise.prototype);
  })( global.RSVP = {} );

// *** UPNP SERVICE WRAPPER ***

  var UPnP = function( serviceObj, opts ) {

    this.options = opts || { debug: false };
    this.svc = serviceObj;

    // API stub
    this.action = function() {};
    
    if( !this.svc || !(this.svc instanceof NetworkService) ) {

      this.debugLog('First argument provided in constructor MUST be a valid NetworkService object');

      return this;
    }

    if( !this.svc.type || this.svc.type.indexOf('upnp:') !== 0 ) {

      this.debugLog('First argument provided in constructor MUST be a _UPnP_ NetworkService object');

      return this;

    }

    this.svcType = this.svc.type.replace('upnp:', '');
    
    this.svcUrl = this.svc.url;
    
    var self = this;

    // Full API
    this.action = function( upnpAction, upnpParameters, callback ) {

      var promise = new RSVP.Promise( this );

      // Handle .action( name, callback )
      if( !callback && Object.prototype.toString.call( upnpParameters ) == '[object Function]' ) {
        callback = upnpParameters;
        upnpParameters = {};
      }
      
      // Generate a callback stub if a Function has not been provided
      if( !callback || Object.prototype.toString.call( callback ) !== '[object Function]' ) {
        callback = function(e, response) {};
      }
      
      // Create a UPnP XML Request message
      var svcMsg = this.createRequest( this.svcType, upnpAction, upnpParameters );

      // Send the UPnP XML Request message to the current service
      this.sendRequest( this.svcType, upnpAction, this.svcUrl, svcMsg, function(e, xmlResponse) {
        
        if(e !== null) {
          callback.apply(self, [ e, null ]);
          promise.reject( e );
          return;
        }

        // Parse UPnP XML Response message
        self.handleResponse( upnpAction, xmlResponse.responseXML || "", upnpParameters, function(e, upnpResponse) {

          // Fire callback
          callback.apply(self, [e, upnpResponse]);
         
          // Fire promise
          if( e !== null) {
            promise.reject( e );
          } else {
            promise.resolve( upnpResponse );
          }
          
        });
        
      });
      
      return promise;

    }

  };

  UPnP.prototype.constructor = UPnP;

  // UPnP XML MESSAGING TEMPLATES

  UPnP.prototype.requestTemplate = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n" +
   "<s:Envelope s:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\" " +
     "xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\">\n" +
     "\t<s:Body>\n" +
       "\t\t<u:{ACTION_NAME} xmlns:u=\"{ACTION_TYPE}\">\n" +
         "{ACTION_VARS}" +
       "\t\t</u:{ACTION_NAME}>\n" +
     "\t</s:Body>\n" +
   "</s:Envelope>\n";

  // UPNP PRIMITIVE VARIABLE TYPE CHECKERS
  // from http://upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.0.pdf
  UPnP.prototype.types = {

    "i1": function(val, allowedValues, toNative) {
      var i8 = new Int8Array(1);
      i8[0] = val;

      return UPnP.prototype.checkAllowedValues( i8[0] , allowedValues );

    },

    "i2": function(val, allowedValues, toNative) {
      var i16 = new Int16Array(1);
      i16[0] = val;
      return UPnP.prototype.checkAllowedValues( i16[0] , allowedValues );
    },

    "i4": function(val, allowedValues, toNative) {
      var i32 = new Int32Array(1);
      i32[0] = val;
      return UPnP.prototype.checkAllowedValues( i32[0] , allowedValues );
    },

    "ui1": function(val, allowedValues, toNative) {
      var ui8 = new Uint8Array(1);
      ui8[0] = val;
      return UPnP.prototype.checkAllowedValues( ui8[0] , allowedValues );
    },

    "ui2": function(val, allowedValues, toNative) {
      var ui16 = new Uint16Array(1);
      ui16[0] = val;
      return UPnP.prototype.checkAllowedValues( ui16[0] , allowedValues );
    },

    "ui4": function(val, allowedValues, toNative) {
      var ui32 = new Uint32Array(1);
      ui32[0] = val;
      return UPnP.prototype.checkAllowedValues( ui32[0] , allowedValues );
    },

    "int": function(val, allowedValues, toNative) {
      if(val === undefined || val === null || isNaN(val)) {
        val = 0;
      } else if (typeof val !== 'number') {
        if(val === true) {
          val = 1;
        } else {
          val = parseInt(val + "", 10);
        }
      }
      if( !toNative ) {
        val = expandExponential( val + "" );
      }
      if(isNaN(val)) val = 0;
      return UPnP.prototype.checkAllowedValues( val , allowedValues );
    },

    "r4": function(val, allowedValues, toNative) {
      var f32 = new Float32Array(1);
      f32[0] = val;
      if( !toNative ) {
        return f32[0] ? expandExponential( f32[0] + "" ) : "0";
      }
      return UPnP.prototype.checkAllowedValues( f32[0] , allowedValues );
    },

    "r8": function(val, allowedValues, toNative) {
      var f64 = new Float64Array(1);
      f64[0] = val;
      if( !toNative ) {
        return f64[0] ? expandExponential( f64[0] + "" ) : "0";
      }
      return UPnP.prototype.checkAllowedValues( f64[0] , allowedValues );
    },

    "number": function(val, allowedValues, toNative) {
      return UPnP.prototype.types['r8'](val, allowedValues, toNative);
    },

    "fixed_14_4": function(val, allowedValues, toNative) {
      return UPnP.prototype.types['float'](val, allowedValues, toNative);
    },

    "float": function(val, allowedValues, toNative) {
      var _float = parseFloat(val);
      if( !toNative ) {
        return _float ? expandExponential( _float + "" ) : "0";
      }
      return UPnP.prototype.checkAllowedValues( _float , allowedValues );
    },

    "char": function(val, allowedValues, toNative) {
      if(val === undefined || val === null || val === "" || (val + "") == "NaN" || val instanceof RegExp) {
        val = "";
      } else if(val === false || val === true || val == "true" || val == "yes" || val == "false" || val == "no") {
        val = (val === true || val == "true" || val == "yes") ? "1" : "0";
      } else {
        val = val.toString();
      }
      if(val.length > 0) {
        val = UPnP.prototype.checkAllowedValues( val, allowedValues );
        return val.charAt(0);
      }
      return val;
    },

    "string": function(val, allowedValues, toNative) {
      if(val === undefined || val === null || val === "" || (val + "") == "NaN" || val instanceof RegExp) {
        val = "";
      }
      val = val + "";
      
      val = UPnP.prototype.checkAllowedValues( val, allowedValues );
      return val;
    },

    "date": function(val, allowedValues, toNative) {
      return UPnP.prototype.types['dateTime'](val, allowedValues, toNative);
    },

    "dateTime": function(val, allowedValues, toNative) {
      if( toNative ) { // Parse to ECMA Date object
        if( Object.prototype.toString.call( val ) == '[object String]' ) {
          val = new Date( parseDate( val ) );
          if(isNaN(val)) val = "";
        } else if( Object.prototype.toString.call( val ) == '[object Date]' ) {
          val = val;
        }
      } else { // Parse to ISO-8601 string
        if( Object.prototype.toString.call( val ) == '[object String]' ) {
          val = val + "";
        } else if( Object.prototype.toString.call( val ) == '[object Date]' ) {
          if(val.toString() == "Invalid Date") { // opera specific functionality
            val = "";
          } else {
            val = val.toISOString();
          }
        }
      }
      val = UPnP.prototype.checkAllowedValues( val, allowedValues );
      return val;
    },

    "dateTime_tz": function(val, allowedValues, toNative) {
      return UPnP.prototype.types['dateTime'](val, allowedValues, toNative);
    },

    "time": function(val, allowedValues, toNative) {
      return UPnP.prototype.types['dateTime'](val, allowedValues, toNative);
    },

    "time_tz": function(val, allowedValues, toNative) {
      return UPnP.prototype.types['dateTime'](val, allowedValues, toNative);
    },

    "boolean": function(val, allowedValues, toNative) {
      if(val == 'false' || val == 'f' || val == 'no' || val == 'n' || val instanceof RegExp || val <= 0 || !val) {
        if(toNative) {
          val = false;
        } else {
          val = "0";
        }
      } else {
        if(toNative) {
          val = true;
        } else {
          val = "1";
        }
      }
      return val;
    },

    "bin_base64": function(val, allowedValues, toNative) {
      if(val === undefined || val === null || val === "" || (val + "") == "NaN" || val instanceof RegExp) {
        val = "";
      }
      if(val === true || val === false ) {
        val = val === true ? "1" : "0";
      }
      if( toNative ) { // convert to string
        val = atob( val + "" );
      } else { // convert to base64
        val = btoa( val + "" );
      }
      return UPnP.prototype.checkAllowedValues( val, allowedValues );
    },

    "bin_hex": function(val, allowedValues, toNative) {
      if(val === undefined || val === null || val === "" || (val + "") == "NaN" || val instanceof RegExp) {
        val = "";
      }
      if(val === true || val === false ) {
        val = val === true ? "1" : "0";
      }
      if( toNative ) { // convert to string
        val = htoa( val + "" );
      } else { // convert to hex
        val = atoh( val + "" );
      }
      return UPnP.prototype.checkAllowedValues( val, allowedValues );
    },

    "uri": function(val, allowedValues, toNative) {
      if( toNative ) {
        val = decodeURI(val + "");
      }
      return UPnP.prototype.types['string'](val, allowedValues); // No URI syntax checking
    },

    "uuid": function(val, allowedValues, toNative) {
      return UPnP.prototype.types['string'](val, allowedValues); // No UUID syntax checking
    }

  };

  // Override .types toString function
  for(var type in UPnP.prototype.types) {
     UPnP.prototype.types[ type ]._name = type;
     UPnP.prototype.types[ type ]["toString"] = function() { return this._name; };
  }
  
  UPnP.prototype.createRequest = function( upnpServiceType, upnpActionName, parameters ) {
    
    parameters = this.formatParameters( parameters );
    
    this.debugLog( 'Creating UPnP XML Control Message for [' + upnpActionName + '] with parameters:' );
    this.debugLog( JSON ? JSON.stringify( parameters ) : null );

    // Build basic part of XML request
    var svcMsg = this.requestTemplate.replace(/\{ACTION_TYPE\}/g, encodeXML(trim(upnpServiceType)));

    svcMsg = svcMsg.replace(/\{ACTION_NAME\}/g, encodeXML(trim(upnpActionName)));

    var svcInParams = parameters['request'],
        svcInParams_xml = "";

    if( svcInParams ) {

      // Generate XML parameters syntax
      for(var svcParam in svcInParams) {

        // Perform type checking sanitization
        if( svcInParams[ svcParam ]['type'] !== undefined && svcInParams[ svcParam ]['type'] !== null ) {

          // get the primitive sanitization function
          var typeCheck = this.types[ svcInParams[ svcParam ]['type'] ];

          if( typeCheck ) {
            svcInParams[ svcParam ]['value'] = typeCheck( svcInParams[ svcParam ]['value'], svcInParams[ svcParam ][ 'allowedValueList' ], false );
          }

        }

        if( svcInParams[ svcParam ]['value'] === null || svcInParams[ svcParam ]['value'] === undefined ) {

          svcInParams[ svcParam ]['value'] = ""; // pass through empty value

        }

        svcInParams_xml += "\t\t\t<" + svcParam + ">" + encodeXML(trim(svcInParams[ svcParam ]['value'] + "")) + "</" + svcParam + ">\n";

      }

    }

    // Add ACTION_VARS, if any
    svcMsg = svcMsg.replace(/\{ACTION_VARS\}/g, svcInParams_xml);

    // DEBUG
    this.debugLog( '[REQUEST] (SOAPAction: ' + upnpServiceType + '#' + upnpActionName + ') ' + svcMsg );

    return svcMsg;
    
  };

  UPnP.prototype.sendRequest = function( upnpServiceType, upnpActionName, upnpEndpointURL, upnpRequestXML, onUPnPResponse ) {

    // Send XML action message

    try {

      var xhr = xhrManager.get();

      xhr.open( 'POST', upnpEndpointURL );

      xhr.setRequestHeader('SOAPAction', '"' + upnpServiceType.replace(/[\"\#]/g, '') + '#' + upnpActionName.replace(/[\"\#]/g, '') + '"');
      xhr.setRequestHeader('Content-Type', 'text/xml; charset="utf-8";');

      xhr.onabort = xhr.onerror = function () {

        onUPnPResponse.apply(undefined, [ new UPnPError('XmlHttpRequest failed'), null ]);

        xhrManager.release( xhr );

      };

      var self = this;

      xhr.onreadystatechange = function () {
        
        if ( this.readyState < 4 ) return;

        if( this.status !== 200 ) {

          onUPnPResponse.apply(undefined, [ new UPnPError('XmlHttpRequest expected 200 OK. Received ' + this.status + ' response.'), null ]);

          self.debugLog( "[ERROR-RESPONSE] " + this.responseText );

          xhrManager.release( xhr );

          return;

        }

        self.debugLog( "[SUCCESS-RESPONSE] " + this.responseText );
        
        onUPnPResponse.apply(this, [ null, this ]);

        xhrManager.release( xhr );

      };

      xhr.send( upnpRequestXML );

    } catch(e) {

      onUPnPResponse.apply(undefined, [ new UPnPError( e ), null ]);

    }
    
    return this; // allow method chaining

  };

  UPnP.prototype.handleResponse = function( upnpActionName, upnpResponseXML, parameters, onUPnPResolved ) {
    
    parameters = this.formatParameters( parameters );
    
    var svcOutParams = parameters['response'];

    var responseJSON = {};

    // Process all XML response variables
    var responseContainer = upnpResponseXML.getElementsByTagName ? 
                              upnpResponseXML.getElementsByTagName( upnpActionName + "Response" ) : null;
    
    // If we don't have any response variables, try again with the namespace attached (required for lib to work in Firefox)
    if( responseContainer === null || responseContainer.length <= 0 ) {
      responseContainer = upnpResponseXML.getElementsByTagName ? 
                                upnpResponseXML.getElementsByTagName( "u:" + upnpActionName + "Response" ) : null;
    }

    if( responseContainer !== null && responseContainer.length > 0 ) {

      var responseVars = responseContainer[0].childNodes;

      if( responseVars && responseVars.length > 0 ) {

        for(var i = 0, l = responseVars.length; i < l; i++ ) {

          var varName = responseVars[i].nodeName;
          var varVal = responseVars[i].textContent? trim(decodeXML(responseVars[i].textContent + "")) : null;

          // Perform type checking sanitization if requested
          if( svcOutParams[ varName ] && svcOutParams[ varName ]['type'] !== undefined && svcOutParams[ varName ]['type'] !== null ) {

            // get the primitive sanitization function
            var typeCheck = this.types[ svcOutParams[ varName ]['type'] ];

            if( typeCheck ) {
              varVal = typeCheck( varVal, svcOutParams[ varName ][ 'allowedValueList' ] || null, true );
            }

          }

          responseJSON[ varName ] = (varVal !== undefined && varVal !== null) ? varVal : "";

        }

      }

    }

    // Fire callback with the parsed action response data
    onUPnPResolved.apply(undefined, [ null, { data: responseJSON } ]);
    
    return this; // allow method chaining

  };

  UPnP.prototype.formatParameter = function( parameter ) {

    var param = {};

    if( parameter['type'] !== undefined || parameter['value'] !== undefined || parameter['allowedValueList'] !== undefined ) {

      param = parameter;
      
      if( parameter['allowedValueList'] !== undefined && typeof parameter['allowedValueList'] !== 'array' ) {
        parameter['allowedValueList'] = [];
      }

    } else {

      param = { value: parameter };

    }

    // check type is valid, otherwise discard requested type
    if( param['type'] !== undefined && param['type'] !== null ) {

      if( !this.types[ (param['type'] + "") ] ) {

        delete param['type'];

      }

    }

    return param;

  };

  // Normalize the input parameters argument
  UPnP.prototype.formatParameters = function( parameters ) {

    if(parameters === undefined || parameters === null) {
      parameters = {};
    }

    if(!parameters['request']) {
      parameters['request'] = {};
    }

    if(!parameters['response']) {
      parameters['response'] = {};
    }

    for( var param in parameters ) {

      if( param === 'request' || param === 'response' ) {

        for(var processParam in parameters[param] ) {

          parameters[param][ processParam ] = this.formatParameter( parameters[param][ processParam ] );

        }

      } else { // append as 'request' parameter and remove from root object

          parameters['request'][ param ] = this.formatParameter( parameters[ param ] );

          delete parameters[ param ];

      }

    }

    return parameters;

  };
  
  // ALLOWED VALUE LIST CHECKER
  
  UPnP.prototype.checkAllowedValues = function( val, allowedValueList ) {
    
    // Check against allowedValues if provided
    if( val && allowedValueList && Object.prototype.toString.call( allowedValueList ) == '[object Array]' ) {
      
      var matchFound = false;
      
      for( var i = 0, l = allowedValueList.length; i < l; i++ ) {
        
        if( val == allowedValueList[i] ) {
          
          matchFound = true;
          break;
          
        }
      }
      
      if( !matchFound ) {
        return "";
      }
    }
    
    return val;
    
  };

  // UPnP DEBUGGER

  UPnP.prototype.debugLog = function( msg, level ) {
    if( (this.options && this.options.debug) ) {
      console[level || 'log']( "Plug.UPnP: " + msg );
    }
  };
  
  // UPnP HTTP MESSAGING MANAGER

  var xhrManager = ( function() {
    var pool = [];
    return {
        get: function () {
            return pool.pop() || new XMLHttpRequest({mozSystem: true});
        },
        release: function( xhr ) {
            xhr.onreadystatechange = function () {};
            pool.push( xhr );
        }
    };
  }() );
  
  // UPnP ERROR OBJECT

  var UPnPError = function( description ) {
    return {
      'description': description
    };
  };

// *** CUSTOM TYPE FUNCTIONS ***

  // BASE64 FUNCTIONS
  // (forked from https://github.com/dankogai/js-base64/blob/master/base64.js)

  var b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  var b64tab = (function(bin) {
      var t = {};
      for (var i = 0, l = bin.length; i < l; i++) t[bin.charAt(i)] = i;
      return t;
  })(b64chars);

  var cb_encode = function(ccc) {
      var padlen = [0, 2, 1][ccc.length % 3],
          ord = ccc.charCodeAt(0) << 16
              | ((ccc.length > 1 ? ccc.charCodeAt(1) : 0) << 8)
              | ((ccc.length > 2 ? ccc.charCodeAt(2) : 0)),
          chars = [
              b64chars.charAt( ord >>> 18),
              b64chars.charAt((ord >>> 12) & 63),
              padlen >= 2 ? '=' : b64chars.charAt((ord >>> 6) & 63),
              padlen >= 1 ? '=' : b64chars.charAt(ord & 63)
          ];
      return chars.join('');
  };

  var cb_decode = function(cccc) {
      var len = cccc.length,
          padlen = len % 4,
          n = (len > 0 ? b64tab[cccc.charAt(0)] << 18 : 0)
            | (len > 1 ? b64tab[cccc.charAt(1)] << 12 : 0)
            | (len > 2 ? b64tab[cccc.charAt(2)] <<  6 : 0)
            | (len > 3 ? b64tab[cccc.charAt(3)]       : 0),
          chars = [
              String.fromCharCode( n >>> 16),
              String.fromCharCode((n >>>  8) & 0xff),
              String.fromCharCode( n         & 0xff)
          ];
      chars.length -= [0, 0, 2, 1][padlen];
      return chars.join('');
  };

  var btoa = global.btoa || function(b) {
      return b.replace(/[\s\S]{1,3}/g, cb_encode);
  };

  var atob = global.atob || function(a){
      return a.replace(/[\s\S]{1,4}/g, cb_decode);
  };

  // HEX FUNCTIONS

  var hexChars = '0123456789abcdef';

  var hextab = (function(bin) {
      var t = {};
      for (var i = 0, l = bin.length; i < l; i++) t[i] = bin.charAt(i);
      return t;
  })(hexChars);

  function toHex(n){
      var result = ''
      var start = true;
      for (var i=32; i>0;){
          i-=4;
          var digit = (n>>i) & 0xf;
          if (!start || digit != 0){
              start = false;
              result += hextab[digit];
          }
      }
      return (result==''?'0':result);
  }

  function pad(str, len, pad){
      var result = str;
      for (var i=str.length; i<len; i++){
          result = pad + result;
      }
      return result;
  }

  function ntos(n){
      n=n.toString(16);
      if (n.length == 1) n="0"+n;
      n="%"+n;
      return unescape(n);
  }

  function htoa(str){
      str = str.toUpperCase().replace(new RegExp("s/[^0-9A-Z]//g"));
      var result = "";
      var nextchar = "";
      for (var i=0; i<str.length; i++){
          nextchar += str.charAt(i);
          if (nextchar.length == 2){
              result +=  ntos( parseInt(nextchar, 16) );
              nextchar = "";
          }
      }
      return result;
  }

  function atoh(str){
      var result = "";
      for (var i=0; i<str.length; i++){
          result += pad(toHex(str.charCodeAt(i)&0xff),2,'0');
      }
      return result;
  }
  
  // NUMBER FUNCTIONS
  
  function expandExponential( str ){
      return str.replace(/^([+-])?(\d+).?(\d*)[eE]([-+]?\d+)$/, function(x, s, n, f, c){
          var l = +c < 0, i = n.length + +c, x = (l ? n : f).length,
          c = ((c = Math.abs(c)) >= x ? c - x + l : 0),
          z = (new Array(c + 1)).join("0"), r = n + f;
          return (s || "") + (l ? r = z + r : r += z).substr(0, i += l ? z.length : 0) + (i < r.length ? "." + r.substr(i) : "");
      });
  };

  // STRING FUNCTIONS

  var trim = function( str ) {
    if(String.prototype.trim) {
      return str.trim();
    } else {
      return str.replace(/^\s+|\s+$/g, "");
    }
  };

  var encodeXML = function ( str ) {
    return str.replace(/\&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/'/g, '&#39;')
               .replace(/"/g, '&quot;');
  };

  var decodeXML = function ( str ) {
    return str.replace(/\&quot;/g, '"')
               .replace(/\&\#39;/g, '\'')
               .replace(/\&gt;/g, '>')
               .replace(/\&lt;/g, '<')
               .replace(/\&amp;/g, '&');
  };

  /**
   * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
   * © 2011 Colin Snover <http://zetafleet.com>
   * Released under MIT license.
   *
   * 2012 - Modifications to accept times without dates - by Rich Tibbett
   */

  var parseDate = function (date) {
      var timestamp, struct, minutesOffset = 0, numericKeys = [ 1, 4, 5, 6, 7, 10, 11 ];
      
      if(typeof date !== 'string') date += "";

      if ((struct = /^((\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?)?(?:[T\s]?(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{4}))?)?$/.exec(date))) {

          struct = struct.slice(1, struct.length);

          // avoid NaN timestamps caused by “undefined” values being passed to Date.UTC
          for (var i = 0, k; (k = numericKeys[i]); ++i) {
              struct[k] = +struct[k] || 0;
          }

          // allow undefined days and months
          struct[2] = (+struct[2] || 1) - 1;
          struct[3] = +struct[3] || 1;

          if (struct[8] !== 'Z' && struct[9] !== undefined) {
              minutesOffset = (( struct[10] / 100 ) - (( struct[10] / 100 ) % 1)) * 60 + (struct[10] % 100);

              if (struct[9] === '+') {
                  minutesOffset = 0 - minutesOffset;
              }
          }
          
          timestamp = Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
      }
      else {
          timestamp = Date.parse ? Date.parse(date) : NaN;
      }

      return timestamp;
  };

// *** GLOBAL ASSIGNMENT ***

  if( !global.Plug ) {
    global.Plug = {};
  }
  
  if( !global.Plug.UPnP ) {
    global.Plug.UPnP = UPnP;
  }

})( this );
