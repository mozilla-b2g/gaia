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
 * A UPnP Media Renderer API for the following service types:
 *
 * - urn:schemas-upnp-org:service:AVTransport:1
 * - urn:schemas-upnp-org:service:AVTransport:2
 *
 */
!(function( global, undefined ) {

  if( !global.Plug || !global.Plug.UPnP ) {
    console.error("plug.play.js must be loaded before you can use this library");
    return;
  }

  var allowedUPnPTypes = {
    'urn:schemas-upnp-org:service:AVTransport:1': true,
    'urn:schemas-upnp-org:service:AVTransport:2': true
  };

  var UPnPAVTransport = function( serviceObj, opts ) {

    Plug.UPnP.apply( this, [ serviceObj, opts ] );

    this.upnpType = serviceObj.type;
    if( serviceObj.type.indexOf('upnp:') === 0 ) {
      this.upnpType = this.upnpType.replace('upnp:', '');
    }

    if( !allowedUPnPTypes[ this.upnpType ] ) {
      console.error("Provided service is not a UPnP Media Renderer Service");
      return;
    }

  // *** AVTransport:1 methods

    this.getDeviceCapabilities = function( instanceId, callback ) {

      return this.action('GetDeviceCapabilities', {
        request: {
          InstanceID: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {
          PlayMedia: {
            type: this.types.string
          },
          RecMedia: {
            type: this.types.string
          },
          RecQualityModes: {
            type: this.types.string
          }
        }
      }, callback);

    };

    this.getMediaInfo = function( instanceId, callback ) {

      return this.action('GetMediaInfo', {
        request: {
          InstanceID: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {
          NrTracks: {
            type: this.types.ui4
          },
          MediaDuration: {
            type: this.types.string
          },
          CurrentURI: {
            type: this.types.string
          },
          CurrentURIMetaData: {
            type: this.types.string
          },
          NextURI: {
            type: this.types.string
          },
          NextURIMetaData: {
            type: this.types.string
          },
          PlayMedium: {
            type: this.types.string
          },
          RecordMedium: {
            type: this.types.string
          },
          WriteStatus: {
            type: this.types.string
          }
        }
      }, callback);

    };

    this.getPositionInfo = function( instanceId, callback ) {

      return this.action('GetPositionInfo', {
        request: {
          InstanceID: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {
          Track: {
            type: this.types.ui4
          },
          TrackDuration: {
            type: this.types.string
          },
          TrackMetaData: {
            type: this.types.string
          },
          TrackURI: {
            type: this.types.string
          },
          RelTime: {
            type: this.types.string
          },
          AbsTime: {
            type: this.types.string
          },
          RelCount: {
            type: this.types.i4
          },
          AbsCount: {
            type: this.types.i4
          }
        }
      }, callback);

    };

    this.getTransportInfo = function( instanceId, callback ) {

      return this.action('GetTransportInfo', {
        request: {
          InstanceID: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {
          CurrentTransportState: {
            type: this.types.string
          },
          CurrentTransportStatus: {
            type: this.types.string
          },
          CurrentSpeed: {
            type: this.types.string
          }
        }
      }, callback);

    };

    this.getTransportSettings = function( instanceId, callback ) {

      return this.action('GetTransportSettings', {
        request: {
          InstanceID: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {
          PlayMode: {
            type: this.types.ui4
          },
          RecQualityMode: {
            type: this.types.string
          }
        }
      }, callback);

    };

    this.setAVTransportURI = function( instanceId, currentURI, currentURIMetaData, callback ) {

      return this.action('SetAVTransportURI', {
        request: {
          InstanceID: {
            value: instanceId,
            type: this.types.ui4
          },
          CurrentURI: {
            value: currentURI,
            type: this.types.string
          },
          CurrentURIMetaData: {
            value: currentURIMetaData,
            type: this.types.string
          }
        },
        response: {}
      }, callback);

    };

    this.play = function( instanceId, speed, callback ) {

      return this.action('Play', {
        request: {
          InstanceID: {
            value: instanceId,
            type: this.types.ui4
          },
          Speed: {
            value: speed || '1',
            type: this.types.string
          }
        },
        response: {}
      }, callback);

    };

    this.pause = function( instanceId, callback ) {

      return this.action('Pause', {
        request: {
          InstanceID: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {}
      }, callback);

    };

    this.stop = function( instanceId, callback ) {

      return this.action('Stop', {
        request: {
          InstanceID: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {}
      }, callback);

    };

    this.next = function( instanceId, callback ) {

      return this.action('Next', {
        request: {
          InstanceID: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {}
      }, callback);

    };

    this.previous = function( instanceId, callback ) {

      return this.action('Previous', {
        request: {
          InstanceID: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {}
      }, callback);

    };

    this.seek = function( instanceId, unit, target, callback ) {

      return this.action('Seek', {
        request: {
          InstanceID: {
            value: instanceId,
            type: this.types.ui4
          },
          Unit: {
            value: unit,
            type: this.types.string
          },
          Target: {
            value: target,
            type: this.types.string
          }
        },
        response: {}
      }, callback);

    };

  // *** AVTransport:2 methods

    if(this.upnpType === 'urn:schemas-upnp-org:service:AVTransport:2') {

        // TODO

    }

  };

  UPnPAVTransport.prototype = Object.create( Plug.UPnP.prototype );

// *** GLOBAL ASSIGNMENT ***

  global.Plug.UPnP_AVTransport = UPnPAVTransport;

})( this );