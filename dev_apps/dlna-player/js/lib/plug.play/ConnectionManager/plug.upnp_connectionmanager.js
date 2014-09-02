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

/**
 * A UPnP API for the following service types:
 *
 * - urn:schemas-upnp-org:service:ConnectionManager:1
 * - urn:schemas-upnp-org:service:ConnectionManager:2
 * - urn:schemas-upnp-org:service:ConnectionManager:3
 *
 */
!(function( global, undefined ) {

  if( !global.Plug || !global.Plug.UPnP ) {
    console.error("plug.play.js must be loaded before you can use this library");
    return;
  }

  var allowedUPnPTypes = {
    'urn:schemas-upnp-org:service:ConnectionManager:1': true,
    'urn:schemas-upnp-org:service:ConnectionManager:2': true,
    'urn:schemas-upnp-org:service:ConnectionManager:3': true
  };

  var UPnPConnectionManager = function( serviceObj, opts ) {

    Plug.UPnP.apply( this, [ serviceObj, opts ] );

    this.upnpType = serviceObj.type;
    if( serviceObj.type.indexOf('upnp:') === 0 ) {
      this.upnpType = this.upnpType.replace('upnp:', '');
    }

    if( !allowedUPnPTypes[ this.upnpType ] ) {
      console.error("Provided service is not a UPnP Service");
      return;
    }

  // *** ConnectionManager:1 methods
    this.prepareForConnection =
    function(protocol, peerCM, peerCID, direction, callback) {
      return this.action('PrepareForConnection', {
        request: {
          RemoteProtocolInfo: {
            type: this.types.string,
            value: protocol
          },
          PeerConnectionManager: {
            type: this.types.string,
            value: peerCM
          },
          PeerConnectionID: {
            type: this.types.i4,
            value: peerCID
          },
          Direction: {
            type: this.types.string,
            value: direction
          }
        },
        response: {
          ConnectionIDs: {
            type: this.types.string
          },
          AVTransportID: {
            type: this.types.i4
          },
          RcsID: {
            type: this.types.i4
          }
        }
      }, callback);
    };

    this.getCurrentConnectionIDs = function( callback ) {

      return this.action('GetCurrentConnectionIDs', {
        request: {},
        response: {
          ConnectionIDs: {
            type: this.types.string
          }
        }
      }, callback);

    };

    this.getCurrentConnectionInfo = function( connectionId, callback ) {

      return this.action('GetCurrentConnectionInfo', {
        request: {
          ConnectionID: {
            value: connectionId,
            type: this.types.ui4
          }
        },
        response: {
          RcsID: {
            type: this.types.i4
          },
          AVTransportID: {
            type: this.types.i4
          },
          ProtocolInfo: {
            type: this.types.string
          },
          PeerConnectionManager: {
            type: this.types.string
          },
          PeerConnectionID: {
            type: this.types.i4
          },
          Direction: {
            type: this.types.string
          },
          Status: {
            type: this.types.string
          }
        }
      }, callback);
    };

    this.getProtocolInfo = function( callback ) {

      return this.action('GetProtocolInfo', {
        request: {},
        response: {
          Source: {
            type: this.types.string
          },
          Sink: {
            type: this.types.string
          }
        }
      }, callback);

    };

  // *** ConnectionManager:2 methods

    if(this.upnpType === 'urn:schemas-upnp-org:service:ConnectionManager:2') {
        // TODO
    }

  };

  UPnPConnectionManager.prototype = Object.create( Plug.UPnP.prototype );

// *** GLOBAL ASSIGNMENT ***

  global.Plug.UPnP_ConnectionManager = UPnPConnectionManager;

})( this );