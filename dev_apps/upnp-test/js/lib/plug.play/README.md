Plug.Play.js
====================

A JavaScript API for communicating with Universal Plug and Play (UPnP) Services obtained via the [W3C Network Service Discovery draft specification (4th October 2012 version)](http://www.w3.org/TR/2012/WD-discovery-api-20121004/).

### Setup

This API requires a web browser that supports [<code>navigator.getNetworkServices</code>](http://www.w3.org/TR/2012/WD-discovery-api-20121004/#dom-navigator-getnetworkservices).

Opera [released a Labs build](http://dev.opera.com/articles/view/network-service-discovery-api-support-in-opera/) that provides support for this API. You can read more and download the browser builds at the [Dev.Opera blog](http://dev.opera.com/articles/view/network-service-discovery-api-support-in-opera/).

#### Download this library

You can download a [ZIP](https://github.com/richtr/plug.play.js/zipball/master) or [TAR.GZ](https://github.com/richtr/plug.play.js/tarball/master) file containing all the Plug.Play library code or you can clone this repo via Git as follows:

    git clone git://github.com/richtr/plug.play.js.git

To get started, a UPnP service demo ([example.html](https://github.com/richtr/plug.play.js/blob/master/example.html)) is available and a [test suite](https://github.com/richtr/plug.play.js/blob/master/test) is also included for checking the validity of the API.

### Work flow

Plug.Play is an API to make working with UPnP Services simple and easy.

The basic work flow for using this API is as follows:

1. Obtain one or more [<code>NetworkService</code>](http://www.w3.org/TR/2012/WD-discovery-api-20121004/#networkservice) objects via [<code>navigator.getNetworkServices</code>](http://www.w3.org/TR/2012/WD-discovery-api-20121004/#dom-navigator-getnetworkservices).
2. Create a new <code>Plug.UPnP</code> object for each [<code>NetworkService</code>](http://www.w3.org/TR/2012/WD-discovery-api-20121004/#networkservice) object returned.
3. Invoke UPnP Service Actions via the <code>Plug.UPnP</code> object's <code>.action()</code> API method.

Each step above is explained in more detail below.

#### Step 1: Obtain <code>NetworkService</code> objects

If you are running this API in a supported browser, as discussed in the [Setup](#setup) section above, you will be able to obtain a set of [<code>NetworkService</code>](http://www.w3.org/TR/2012/WD-discovery-api-20121004/#networkservice) objects as follows:

    if(navigator.getNetworkServices) {
      navigator.getNetworkServices(
        'upnp:urn:schemas-upnp-org:service:RenderingControl:1',
        successCallback
      );
    }

The <code>successCallback</code> function takes one argument, a [<code>NetworkServices</code>](http://www.w3.org/TR/2012/WD-discovery-api-20121004/#networkservices) object that acts like an array of [<code>NetworkService</code>](http://www.w3.org/TR/2012/WD-discovery-api-20121004/#networkservice) objects. When services are found in the current network that match the requested service type(s) the web browser will trigger execution of this function.

    function successCallback( servicesManager ) {
      // Dump services to console
      for( var i = 0; i < servicesManager.length; i++ ) {
        console.log( "Service w/ type [" +
                        servicesManager[i].type  + "] available" );
      }
    }

#### Step 2: Create a new <code>Plug.UPnP</code> object

Once we have a <code>successCallback</code> function defined, we can create new <code>Plug.UPnP</code> objects.

To create a new <code>Plug.UPnP</code> object we to need pass in a single (UPnP-based) [<code>NetworkService</code>](http://www.w3.org/TR/2012/WD-discovery-api-20121004/#networkservice)
object as the first argument.

    var upnpService = new Plug.UPnP( servicesManager[i] );

Here's a full example, expanding and replacing the <code>successCallback</code> function we defined earler:

    function successCallback( servicesManager ) {

      // Create a new UPnP object for each service returned
      var upnpServices = [];

      for( var i = 0; i < servicesManager.length; i++ ) {

        upnpServices.push(
          new Plug.UPnP( servicesManager[i] )
        );

        // doUPnPGetMute code provided in Step 3...
        doUPnPGetMute( upnpServices[ upnpServices.length - 1 ] );

      }

    }

You can optionally, include a second argument to this constructor to override the default <code>Plug.UPnP</code> options:

    new Plug.UPnP( servicesManager[i], { debug: true } )

The current list of values that can be provided in the options argument are as follows:

###### debug

_Boolean. Whether to spit out more debug messages to the console. Useful when debugging errors in your web app._

#### Step 3: Invoke UPnP actions and process UPnP responses

The Plug.Play API is built to work on top of [rsvp.js](https://github.com/tildeio/rsvp.js) and therefore provides a  [Promises/A](http://wiki.commonjs.org/wiki/Promises/A)-based interaction model. As part of the Promises model this API supports [method chaining](https://github.com/kriskowal/q#chaining) and [promise sequences](https://github.com/kriskowal/q#sequences).

Here is a simple example of querying the mute state of a UPnP RenderingControl:1 service on a created <code>Plug.UPnP</code> object called <code>upnpService</code>:

    function doUPnPGetMute( upnpService ) {

      upnpService.action('GetMute', {
        InstanceId: 0,
        Channel: 'Master'
      })
      .then(function( response ) {

        console.log("Service is reporting MUTE=[" +
          (response.data.CurrentMute == "1" ? 'on' : 'off') +
            "]");

      })
      .then( null, function( error ) { // All errors will propagate here

        console.log( error.description );

      });

    }

The Plug.Play library also comes with some convenience classes for particular service types. The demo provided above can also be written against the well-defined [UPnPRenderingControl API](https://github.com/richtr/plug.play.js/tree/master/lib/RenderingControl) also included in this repository. More service-specific wrappers will be added to this repository soon.

### Advanced Usage

##### Type Checking & Conversion

You can enforce type checking and type conversion controls in this API according to the data types defined for UPnP in the [UPnP Device Architecture specification](http://upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf).

The following code is equivalent to the doUPnPGetMute() function defined above but this time we enforce the variable types and constrain inputs to a series of allowed value types for each input variable:

    function doUPnPGetMute( upnpService ) {

      upnpService.action('GetMute', {
        InstanceId: {
          type: upnpService.types.ui4, // or just write 'ui4'
          value: 0
        },
        Channel: {
          type: upnpService.types.string, // or just write 'string'
          value: 'Master',
          allowedValueList:
            ['Master', 'LF', 'RF', 'CF', 'LFE', 'LS', 'RS',
                'LFC', 'RFC', 'SD', 'SL', 'SR', 'T', 'B']
        }
      })
      .then(function( response ) {

        console.log("Service is reporting MUTE=[" +
          (response.data.CurrentMute == "1" ? 'on' : 'off' +
            "]");

      })
      .then( null, function( error ) {

        console.log( "An error occurred: " + error.description );

      });

    }

Furthermore, we can use the same structure to enforce variable type conversion on UPnP message response objects. This is useful in particular where we need or want to convert XML types to native JavaScript object types (such as booleans, numbers or dates).

To do this we supply a more structured argument consisting of two parts: <code>request</code> parameters and <code>response</code> parameters. We assign our type checking/conversion rules as required in this structure:

    function doUPnPGetMute( upnpService ) {

      upnpService.action('GetMute', {
        request: {
          InstanceId: {
            type: upnpService.types.ui4,
            value: 0
          },
          Channel: {
            type: upnpService.types.string,
            value: 'Master',
            allowedValueList:
              ['Master', 'LF', 'RF', 'CF', 'LFE', 'LS', 'RS',
                  'LFC', 'RFC', 'SD', 'SL', 'SR', 'T', 'B']
          }
        },
        response: {
          CurrentMute: {
            type: upnpService.types.boolean,
            value: false // default response value if
                         // none is provided (optional)
          }
        }
      })
      .then( function( response ) {

        // Note: we no longer need to check for '== "1"' below because
        // response.data.CurrentMute is now a native JS boolean as we
        // defined in our <actionParameters> above:

        console.log("Service is reporting MUTE=[" +
          (response.data.CurrentMute ? 'on' : 'off') +
            "]");

      }, function( error ) { // Handle any errors

        console.log( "An error occurred: " + error.description );

      });

    }

Plug.Play API calls can be [chained](https://github.com/kriskowal/q#chaining) as follows:

    function doUPnPGetThenSetThenGetMute( upnpService ) {

      upnpService.action('GetMute', {
        request: {
          InstanceId: 0,
          Channel: 'Master'
        },
        response: {
          CurrentMute: {
            type: upnpService.types.boolean
          }
        }
      })
      .then( function( response ) {

        console.log("Service is reporting MUTE=[" +
          (response.data.CurrentMute ? 'on' : 'off') +
            "]");

        return upnpService.action('SetMute', {
          request: {
            InstanceId: 0,
            Channel: 'Master',
            DesiredMute: response.data.CurrentMute ? 0 : 1
          }
        });

      })
      .then( function( response ) {

        return upnpService.action('GetMute', {
          request: {
            InstanceId: 0,
            Channel: 'Master'
          },
          response: {
            CurrentMute: {
              type: upnpService.types.boolean
            }
          }
        })

      })
      .then( function( response ) {

        console.log("Service is reporting MUTE=[" +
          (response.data.CurrentMute ? 'on' : 'off') +
            "]");

      })
      .then( null, function( error ) { // Handle any errors

        console.log( "An error occurred: " + error.description );

      });

    }

##### UPnP data types

The list of valid UPnP data types are as follows:

###### Plug.UPnP.prototype.types.i1

_1 Byte int_

###### Plug.UPnP.prototype.types.i2

_2 Byte int_

###### Plug.UPnP.prototype.types.i4

_4 Byte int_

###### Plug.UPnP.prototype.types.ui1

_Unsigned 1 Byte int_

###### Plug.UPnP.prototype.types.ui2

_Unsigned 2 Byte int_

###### Plug.UPnP.prototype.types.ui4

_Unsigned 4 Byte int_

###### Plug.UPnP.prototype.types.int

_Fixed point, integer number that may have leading sign_

###### Plug.UPnP.prototype.types.r4

_4 Byte float_

###### Plug.UPnP.prototype.types.r8

_8 Byte float_

###### Plug.UPnP.prototype.types.number

_Same as <code>Plug.UPnP.prototype.types.r8</code>_

###### Plug.UPnP.prototype.types.fixed\_14\_4

_Same as <code>Plug.UPnP.prototype.types.r8</code> but no more than 14 digits to the left of the decimal point and no more than 4 to the right_

###### Plug.UPnP.prototype.types.float

_Floating point number (same as <code>Plug.UPnP.prototype.types.r8</code>)_

###### Plug.UPnP.prototype.types.char

_Unicode string. One character long_

###### Plug.UPnP.prototype.types.string

_Unicode string. No limit on length_

###### Plug.UPnP.prototype.types.date

_Date without time data (accepts ISO-8601 strings or Date objects and returns ECMA <code>Date</code> objects)_

###### Plug.UPnP.prototype.types.dateTime

_Date with optional time but no time zone (accepts ISO-8601 strings or Date objects and returns ECMA <code>Date</code> objects)_

###### Plug.UPnP.prototype.types.dateTime\_tz

_Date with optional time and optional time zone (accepts ISO-8601 strings or Date objects and returns ECMA <code>Date</code> objects)_

###### Plug.UPnP.prototype.types.time

_Time with no date and no time zone (accepts ISO-8601 strings or Date objects and returns ECMA <code>Date</code> objects)_

###### Plug.UPnP.prototype.types.time\_tz

_Time with optional time zone but no date (accepts ISO-8601 strings or Date objects and returns ECMA <code>Date</code> objects)_

###### Plug.UPnP.prototype.types.boolean

_<code>true</code> or <code>false</code> (accepts <code>'true'</code>, <code>'false'</code>, <code>'yes'</code>, <code>'y'</code>, <code>'no'</code>, <code>'n'</code> and returns ECMA <code>Boolean</code> objects)_

###### Plug.UPnP.prototype.types.bin\_base64

_MIME-style Base64 encoded binary blob_

###### Plug.UPnP.prototype.types.bin\_hex

_Hexadecimal digits representing octets_

###### Plug.UPnP.prototype.types.uri

_Universal Resource Identifier_

###### Plug.UPnP.prototype.types.uuid

_Universally Unique Identifier_

### Feedback

If you find any bugs or issues please report them on the [Plug.Play Issue Tracker](https://github.com/richtr/plug.play.js/issues).

If you would like to contribute to this project please consider [forking this repo](https://github.com/richtr/plug.play.js/fork_select) and then creating a new [Pull Request](https://github.com/richtr/plug.play.js/pulls) back to the main code base.

### License

Copyright &copy; 2012 Opera Software ASA

See the [LICENSE](https://github.com/richtr/plug.play.js/blob/master/LICENSE) file.