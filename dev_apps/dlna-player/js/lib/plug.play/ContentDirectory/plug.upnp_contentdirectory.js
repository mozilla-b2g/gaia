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
 * A UPnP Media Server API for the following service types:
 *
 * - urn:schemas-upnp-org:service:ContentDirectory:1
 * - urn:schemas-upnp-org:service:ContentDirectory:2
 * - urn:schemas-upnp-org:service:ContentDirectory:3
 * - urn:schemas-upnp-org:service:ContentDirectory:4
 *
 */
!(function( global, undefined ) {

  if( !global.Plug || !global.Plug.UPnP ) {
    console.error("plug.play.js must be loaded before you can use this library");
    return;
  }

  var allowedUPnPTypes = {
    'urn:schemas-upnp-org:service:ContentDirectory:1': true,
    'urn:schemas-upnp-org:service:ContentDirectory:2': true,
    'urn:schemas-upnp-org:service:ContentDirectory:3': true,
    'urn:schemas-upnp-org:service:ContentDirectory:4': true
  };

  var UPnPContentDirectory = function( serviceObj, opts ) {

    Plug.UPnP.apply( this, [ serviceObj, opts ] );

    this.upnpType = serviceObj.type;
    if( serviceObj.type.indexOf('upnp:') === 0 ) {
      this.upnpType = this.upnpType.replace('upnp:', '');
    }

    if( !allowedUPnPTypes[ this.upnpType ] ) {
      console.error("Provided service is not a UPnP Media Server Service");
      return;
    }

    var parser = new DOMParser();
    this.configDocument = parser.parseFromString(this.svc.config, 'text/xml');

  // *** ContentDirectory:1 methods

    this.getSystemUpdateId = function( callback ) {

      return this.action('GetSystemUpdateID', {
        request: {},
        response: {
          Id: {
            type: this.types.ui4
          }
        }
      }, callback);

    };

    this.getSearchCapabilities = function( callback ) {

      return this.action('GetSearchCapabilities', {
        request: {},
        response: {
          SearchCaps: {
            type: this.types.string
          }
        }
      }, callback);

    };

    this.getSortCapabilities = function( callback ) {

      return this.action('GetSortCapabilities', {
        request: {},
        response: {
          SortCaps: {
            type: this.types.string
          }
        }
      }, callback);
    };

    this.browse = function( objectId, browseFlag, filter, startingIndex, requestedCount, sortCriteria, callback ) {

      return this.action('Browse', {
        request: {
          ObjectID: {
            value: objectId || '0',
            type: this.types.string
          },
          BrowseFlag: {
            value: browseFlag || 'BrowseDirectChildren',
            type: this.types.string
          },
          Filter: {
            value: filter || '*',
            type: this.types.string
          },
          StartingIndex: {
            value: startingIndex || '0',
            type: this.types.ui4
          },
          RequestedCount: {
            value: requestedCount || '100000',
            type: this.types.ui4
          },
          SortCriteria: {
            value: sortCriteria,
            type: this.types.string
          }
        },
        response: {
          Result: {
            type: this.types.string
          },
          NumberReturned: {
            type: this.types.ui4
          },
          TotalMatches: {
            type: this.types.ui4
          },
          UpdateID: {
            type: this.types.ui4
          }
        }
      }, callback);

    };

    this.search = function( objectId, browseFlag, filter, startingIndex, requestedCount, sortCriteria, callback ) {

      return this.action('Search', {
        request: {
          ObjectID: {
            value: objectId || '0',
            type: this.types.string
          },
          BrowseFlag: {
            value: browseFlag || 'BrowseDirectChildren',
            type: this.types.string
          },
          Filter: {
            value: filter || '*',
            type: this.types.string
          },
          StartingIndex: {
            value: startingIndex || '0',
            type: this.types.ui4
          },
          RequestedCount: {
            value: requestedCount || '100000',
            type: this.types.ui4
          },
          SortCriteria: {
            value: sortCriteria,
            type: this.types.string
          }
        },
        response: {
          Result: {
            type: this.types.string
          },
          NumberReturned: {
            type: this.types.ui4
          },
          TotalMatches: {
            type: this.types.ui4
          },
          UpdateID: {
            type: this.types.ui4
          }
        }
      }, callback);

    };


  // *** ContentDirectory:2 methods

    if(this.upnpType === 'urn:schemas-upnp-org:service:ContentDirectory:2') {

        // TODO: GetFeatureList, GetSortExtensionCapabilities, MoveObject
    }


  // *** ContentDirectory:3 methods

    if(this.upnpType === 'urn:schemas-upnp-org:service:ContentDirectory:3') {

        // TODO

    }

  // *** ContentDirectory:4 methods

    if(this.upnpType === 'urn:schemas-upnp-org:service:ContentDirectory:4') {

        // TODO

    }

  };

  UPnPContentDirectory.prototype = Object.create( Plug.UPnP.prototype );

// *** GLOBAL ASSIGNMENT ***

  global.Plug.UPnP_ContentDirectory = UPnPContentDirectory;

})( this );