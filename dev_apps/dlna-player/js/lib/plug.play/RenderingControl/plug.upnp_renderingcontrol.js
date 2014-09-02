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
 * - urn:schemas-upnp-org:service:RenderingControl:1
 * - urn:schemas-upnp-org:service:RenderingControl:2
 * - urn:schemas-upnp-org:service:RenderingControl:3
 *
 */
!(function( global, undefined ) {

  if( !global.Plug || !global.Plug.UPnP ) {
    console.error("plug.play.js must be loaded before you can use this library");
    return;
  }

  var allowedUPnPTypes = {
    'urn:schemas-upnp-org:service:RenderingControl:1': true,
    'urn:schemas-upnp-org:service:RenderingControl:2': true,
    'urn:schemas-upnp-org:service:RenderingControl:3': true
  };

  var UPnPRenderingControl = function( serviceObj, opts ) {

    Plug.UPnP.apply( this, [ serviceObj, opts ] );

    this.upnpType = serviceObj.type;
    if( serviceObj.type.indexOf('upnp:') === 0 ) {
      this.upnpType = this.upnpType.replace('upnp:', '');
    }

    if( !allowedUPnPTypes[ this.upnpType ] ) {
      console.error("Provided service is not a UPnP Media Renderer Service");
      return;
    }

  // *** RenderingControl:1 methods

    this.listPresets = function( instanceId, callback ) {

      return this.action('ListPresets', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {
          CurrentPresetNameList: {
            type: this.types.string
          }
        }
      }, callback);

    };

    this.selectPreset = function( instanceId, presetName, callback ) {

      return this.action('SelectPreset', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          PresetName: {
            value: presetName || "FactoryDefaults",
            type: this.types.string
          }
        }
      }, callback);

    };

    this.getBrightness = function( instanceId, callback ) {

      return this.action('GetBrightness', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {
          CurrentBrightness: {
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.setBrightness = function( instanceId, desiredBrightness, callback ) {

      return this.action('SetBrightness', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          DesiredBrightness: {
            value: desiredBrightness,
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.getContrast = function( instanceId, callback ) {

      return this.action('GetContrast', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {
          CurrentContrast: {
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.setContrast = function( instanceId, desiredContrast, callback ) {

      return this.action('SetContrast', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          DesiredContrast: {
            value: desiredContrast,
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.getSharpness = function( instanceId, callback ) {

      return this.action('GetSharpness', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {
          CurrentSharpness: {
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.setSharpness = function( instanceId, desiredSharpness, callback ) {

      return this.action('SetSharpness', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          DesiredSharpness: {
            value: desiredSharpness,
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.getRedVideoGain = function( instanceId, callback ) {

      return this.action('GetRedVideoGain', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {
          CurrentRedVideoGain: {
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.setRedVideoGain = function( instanceId, desiredRedVideoGain, callback ) {

      return this.action('SetRedVideoGain', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          DesiredRedVideoGain: {
            value: desiredRedVideoGain,
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.getGreenVideoGain = function( instanceId, callback ) {

      return this.action('GetGreenVideoGain', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {
          CurrentGreenVideoGain: {
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.setGreenVideoGain = function( instanceId, desiredGreenVideoGain, callback ) {

      return this.action('SetGreenVideoGain', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          DesiredGreenVideoGain: {
            value: desiredGreenVideoGain,
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.getBlueVideoGain = function( instanceId, callback ) {

      return this.action('GetBlueVideoGain', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {
          CurrentBlueVideoGain: {
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.setBlueVideoGain = function( instanceId, desiredBlueVideoGain, callback ) {

      return this.action('SetBlueVideoGain', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          DesiredBlueVideoGain: {
            value: desiredBlueVideoGain,
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.getRedVideoBlackLevel = function( instanceId, callback ) {

      return this.action('GetRedVideoBlackLevel', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {
          CurrentRedVideoBlackLevel: {
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.setRedVideoBlackLevel = function( instanceId, desiredRedVideoBlackLevel, callback ) {

      return this.action('SetRedVideoBlackLevel', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          DesiredRedVideoBlackLevel: {
            value: desiredRedVideoBlackLevel,
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.getGreenVideoBlackLevel = function( instanceId, callback ) {

      return this.action('GetGreenVideoBlackLevel', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {
          CurrentGreenVideoBlackLevel: {
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.setGreenVideoBlackLevel = function( instanceId, desiredGreenVideoBlackLevel, callback ) {

      return this.action('SetGreenVideoBlackLevel', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          DesiredGreenVideoBlackLevel: {
            value: desiredGreenVideoBlackLevel,
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.getBlueVideoBlackLevel = function( instanceId, callback ) {

      return this.action('GetBlueVideoBlackLevel', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {
          CurrentBlueVideoBlackLevel: {
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.setBlueVideoBlackLevel = function( instanceId, desiredBlueVideoBlackLevel, callback ) {

      return this.action('SetBlueVideoBlackLevel', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          DesiredBlueVideoBlackLevel: {
            value: desiredBlueVideoBlackLevel,
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.getBlueVideoBlackLevel = function( instanceId, callback ) {

      return this.action('GetBlueVideoBlackLevel', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {
          CurrentBlueVideoBlackLevel: {
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.getColorTemperature = function( instanceId, callback ) {

      return this.action('GetColorTemperature', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {
          CurrentColorTemperature: {
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.setColorTemperature = function( instanceId, desiredColorTemperature, callback ) {

      return this.action('SetColorTemperature', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          DesiredColorTemperature: {
            value: desiredColorTemperature,
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.getHorizontalKeystone = function( instanceId, callback ) {

      return this.action('GetHorizontalKeystone', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {
          CurrentHorizontalKeystone: {
            type: this.types.i2
          }
        }
      }, callback);

    };

    this.setHorizontalKeystone = function( instanceId, desiredHorizontalKeystone, callback ) {

      return this.action('SetHorizontalKeystone', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          DesiredHorizontalKeystone: {
            value: desiredHorizontalKeystone,
            type: this.types.i2
          }
        }
      }, callback);

    };

    this.getVerticalKeystone = function( instanceId, callback ) {

      return this.action('GetVerticalKeystone', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          }
        },
        response: {
          CurrentVerticalKeystone: {
            type: this.types.i2
          }
        }
      }, callback);

    };

    this.setVerticalKeystone = function( instanceId, desiredVerticalKeystone, callback ) {

      return this.action('SetVerticalKeystone', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          DesiredVerticalKeystone: {
            value: desiredVerticalKeystone,
            type: this.types.i2
          }
        }
      }, callback);

    };

    this.getMute = function( instanceId, channel, callback ) {

      return this.action('GetMute', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          Channel: {
            value: channel || 'Master',
            type: this.types.string
          }
        },
        response: {
          CurrentMute: {
            type: this.types.boolean
          }
        }
      }, callback);

    };

    this.setMute = function( instanceId, channel, desiredMute, callback ) {

      return this.action('SetMute', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          Channel: {
            value: channel || 'Master',
            type: this.types.string
          },
          DesiredMute: {
            value: desiredMute,
            type: this.types.boolean
          }
        }
      }, callback);

    };

    this.getVolume = function( instanceId, channel, callback ) {

      return this.action('GetVolume', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          Channel: {
            value: channel || 'Master',
            type: this.types.string
          }
        },
        response: {
          CurrentVolume: {
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.setVolume = function( instanceId, channel, desiredVolume, callback ) {

      return this.action('SetVolume', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          Channel: {
            value: channel || 'Master',
            type: this.types.string
          },
          DesiredVolume: {
            value: desiredVolume,
            type: this.types.ui2
          }
        }
      }, callback);

    };

    this.getVolumeDB = function( instanceId, channel, callback ) {

      return this.action('GetVolumeDB', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          Channel: {
            value: channel || 'Master',
            type: this.types.string
          }
        },
        response: {
          CurrentVolume: {
            type: this.types.i2
          }
        }
      }, callback);

    };

    this.setVolumeDB = function( instanceId, channel, desiredVolume, callback ) {

      return this.action('SetVolumeDB', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          Channel: {
            value: channel || 'Master',
            type: this.types.string
          },
          DesiredVolume: {
            value: desiredVolume,
            type: this.types.i2
          }
        }
      }, callback);

    };

    this.getVolumeDBRange = function( instanceId, channel, callback ) {

      return this.action('GetVolumeDBRange', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          Channel: {
            value: channel || 'Master',
            type: this.types.string
          }
        },
        response: {
          MinValue: {
            type: this.types.i2
          },
          MaxValue: {
            type: this.types.i2
          },
        }
      }, callback);

    };

    this.getLoudness = function( instanceId, channel, callback ) {

      return this.action('GetLoudness', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          Channel: {
            value: channel || 'Master',
            type: this.types.string
          }
        },
        response: {
          CurrentLoudness: {
            type: this.types.boolean
          }
        }
      }, callback);

    };

    this.setLoudness = function( instanceId, channel, desiredLoudness, callback ) {

      return this.action('SetLoudness', {
        request: {
          InstanceId: {
            value: instanceId,
            type: this.types.ui4
          },
          Channel: {
            value: channel || 'Master',
            type: this.types.string
          },
          DesiredLoudness: {
            value: desiredLoudness,
            type: this.types.boolean
          }
        }
      }, callback);

    };

  // *** RenderingControl:2 methods

    if(this.upnpType === 'urn:schemas-upnp-org:service:RenderingControl:2' ||
          this.upnpType === 'urn:schemas-upnp-org:service:RenderingControl:3') {

      this.getStateVariables = function( instanceId, stateVariableList, callback ) {

        return this.action('GetStateVariables', {
          request: {
            InstanceId: {
              value: instanceId,
              type: this.types.ui4
            },
            StateVariableList: {
              value: stateVariableList,
              type: this.types.string
            }
          },
          response: {
            StateVariableValuePairs: {
              type: this.types.string
            }
          }
        }, callback);

      };

      this.setStateVariables = function( instanceId, renderingControlUDN, serviceType, serviceId, stateVariableValuePairs, callback ) {

        return this.action('SetStateVariables', {
          request: {
            InstanceId: {
              value: instanceId,
              type: this.types.ui4
            },
            RenderingControlUDN: {
              value: renderingControlUDN,
              type: this.types.string
            },
            ServiceType: {
              value: serviceType,
              type: this.types.string
            },
            ServiceId: {
              value: serviceId,
              type: this.types.string
            },
            StateVariableValuePairs: {
              value: stateVariableValuePairs,
              type: this.types.string
            }
          },
          response: {
            StateVariableList: {
              type: this.types.string
            }
          }
        }, callback);

      };

    }

  // *** RenderingControl:3 methods

    if(this.upnpType === 'urn:schemas-upnp-org:service:RenderingControl:3') {

      this.getAllowedTransforms = function( instanceId, callback ) {

        return this.action('GetAllowedTransforms', {
          request: {
            InstanceId: {
              value: instanceId,
              type: this.types.ui4
            }
          },
          response: {
            CurrentAllowedTransformSettings: {
              type: this.types.string
            }
          }
        }, callback);

      };

      this.getTransforms = function( instanceId, callback ) {

        return this.action('GetTransforms', {
          request: {
            InstanceId: {
              value: instanceId,
              type: this.types.ui4
            }
          },
          response: {
            CurrentTransformValues: {
              type: this.types.string
            }
          }
        }, callback);

      };

      this.setTransforms = function( instanceId, desiredTransformValues, callback ) {

        return this.action('SetTransforms', {
          request: {
            InstanceId: {
              value: instanceId,
              type: this.types.ui4
            },
            DesiredTransformValues: {
              value: desiredTransformValues,
              type: this.types.string
            }
          }
        }, callback);

      };

      this.getAllAvailableTransforms = function( instanceId, callback ) {

        return this.action('GetAllAvailableTransforms', {
          response: {
            AllAllowedTransformSettings: {
              type: this.types.string
            }
          }
        }, callback);

      };

      this.getAllowedDefaultTransforms = function( instanceId, callback ) {

        return this.action('GetAllowedDefaultTransforms', {
          response: {
            AllowedDefaultTransformSettings: {
              type: this.types.string
            }
          }
        }, callback);

      };

      this.getDefaultTransforms = function( instanceId, callback ) {

        return this.action('GetDefaultTransforms', {
          response: {
            CurrentDefaultTransformSettings: {
              type: this.types.string
            }
          }
        }, callback);

      };

      this.setDefaultTransforms = function( instanceId, desiredDefaultTransformSettings, callback ) {

        return this.action('SetDefaultTransforms', {
          request: {
            DesiredDefaultTransformSettings: {
              value: desiredDefaultTransformSettings,
              type: this.types.string
            }
          }
        }, callback);

      };

    }

  };

  UPnPRenderingControl.prototype = Object.create( Plug.UPnP.prototype );

// *** GLOBAL ASSIGNMENT ***

  global.Plug.UPnP_RenderingControl = UPnPRenderingControl;

})( this );