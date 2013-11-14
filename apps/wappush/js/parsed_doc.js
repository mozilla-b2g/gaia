/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function(exports) {
  'use strict';

  var CONTENT_TYPE = 'application/xml';
  var AUTHTYPE_MAPPING = {
    'PAP': '1',
    'CHAP': '2'
  };
  var TYPE_MAPPING = {
    'w2': 'default',
    'w4': 'mms'
  };

  /**
   * Represents a parsed WAP provisioning document. The most important elements
   * in this document are the APN objects the device needs to set up data calls.
   *
   * @param {String} provisioningDoc The WAP provisioning document (XML string).
   */
  function ParsedProvisioningDoc(provisioningDoc) {
    /** WAP provisioning document */
    this._provisioningDoc = provisioningDoc;

    /** Holds the list of APPLICATION (APPLICATION characteristic is used to
        define application protocol parameters and to describe the attributes
        of an application service access point available using the protocol)
        nodes in the document. */
    this._applicationNodes = null;

    /** Holds the list of NAPDEF (NAPDEF characteristics define network access
        points) nodes in the document */
    this._napDefNodes = null;

    /** Holds the list of PXLOGICAL (PXLOGICAL characteristics define logical
        proxies) nodes in the document. */
    this._pxLogicalNodes = null;

    /** Array containing APN objects */
    this._apns = [],

    /** Array containing APN proxy objects  */
    this._proxies = [];

    /** APNs are ready to use (flag) */
    this._apnsReady = false;
  }

  ParsedProvisioningDoc.prototype = {
    /**
     * Given a PXLOGICAL node it returns the list of PXPHYSICAL (PXPHYSICAL
     * characteristics convey information on physical instances of a logical
     * proxy) nodes inside.
     *
     * @param {element} toProxyNode A PXLOGICAL node.
     *
     * @return {NodeList} List of PXPHYSICAL nodes.
     */
    getPxPhysicalNodes: function pd_getPxPhysicalNodes(toProxyNode) {
       var toProxy = toProxyNode.getAttribute('value');
       var pxLogicalNode = null;
       for (var i = 0; i < this._pxLogicalNodes.length; i++) {
         var selector = 'parm[name="PROXY-ID"][value="' + toProxy + '"]';
         pxLogicalNode = this._pxLogicalNodes[i].querySelector(selector);
         if (pxLogicalNode) {
           break;
         }
       }
       if (!pxLogicalNode) {
         return null;
       }
       return this._pxLogicalNodes[i].querySelectorAll(
         'characteristic[type="PXPHYSICAL"]'
       );
    },

    /**
     * Given a network access point id it returns the NAPDEF node.
     *
     * @param {String} toNapId Network access point id.
     *
     * @return {element} A NAPDEF node.
     */
    getNapDefNode: function pd_getNapDefNode(toNapId) {
      for (var i = 0; i < this._napDefNodes.length; i++) {
        var selector = 'parm[name="NAPID"][value="' + toNapId + '"]';
        var napDefNode = this._napDefNodes[i].querySelector(selector);
        if (napDefNode) {
          return this._napDefNodes[i];
        }
      }
      return null;
    },

    /**
     * Parses the WAP provisioning document. It mainly parses the document and
     * saves the APN objects.
     */
    parse: function pd_parse() {
      if (!this._provisioningDoc) {
        return;
      }

      /**
       * Helper function.
       * Creates an untyped object from a PXPHYSICAL node.
       *
       * @param {element} pxPhysicalNode An PXPHYSICAL node.
       * @param {boolean} isMmsProxy Determines whether PXPHYSICAL node is a
       *                             proxy for MMS.
       *
       * @return {Object} An untyped object holding the properties of an
       *                  PXPHYSICAL node.
       */
      function parsePxPhysicalNode(pxPhysicalNode, isMmsProxy) {
        var obj = {};
        var proxyKey = null, portKey = null;

        proxyKey = isMmsProxy ? 'mmsproxy' : 'proxy';
        portKey = isMmsProxy ? 'mmsport' : 'port';

        var pxAddrNode = pxPhysicalNode.querySelector('parm[name="PXADDR"]');
        if (pxAddrNode) {
          obj[proxyKey] = pxAddrNode.getAttribute('value');
        }

        obj['TO-NAPID'] = [];
        var toNapIdNode = pxPhysicalNode.querySelector('parm[name="TO-NAPID"]');
        if (toNapIdNode) {
          obj['TO-NAPID'].push(toNapIdNode.getAttribute('value'));
        }

        var portNodes =
          pxPhysicalNode.querySelectorAll('characteristic[type="PORT"]');
        for (var j = 0; j < portNodes.length; j++) {
          var portNode = portNodes[j].querySelector('parm[name="PORTNBR"]');
          obj[portKey] = portNode.getAttribute('value');
        }
        return obj;
      }

      /**
       * Helper function.
       * Creates an untyped object from a NAPDEF node.
       *
       * @param {element} napDefNode An NAPDEF node.
       *
       * @return {Object} An untyped object holding the properties of an
       *                  PXPHYSICAL node.
       */
      function parseNapDefNode(napDefNode) {
        var obj = {};

        var napIdNode = napDefNode.querySelector('parm[name="NAPID"]');
        if (napIdNode) {
          obj.NAPID = napIdNode.getAttribute('value');
        }

        var nameNode = napDefNode.querySelector('parm[name="NAME"]');
        if (nameNode) {
          obj.carrier = nameNode.getAttribute('value');
        }

        var apnNode = napDefNode.querySelector('parm[name="NAP-ADDRESS"]');
        if (apnNode) {
          obj.apn = apnNode.getAttribute('value');
        }

        var napAuthInfoNode =
          napDefNode.querySelector('characteristic[type="NAPAUTHINFO"]');
        if (napAuthInfoNode) {
          var authTypeNode =
            napAuthInfoNode.querySelector('parm[name="AUTHTYPE"]');
          if (authTypeNode) {
            var authType = AUTHTYPE_MAPPING[
              authTypeNode.getAttribute('value')
            ];
            if (authType) {
              obj.authtype = authType;
            }
          }

          var authNameNode =
            napAuthInfoNode.querySelector('parm[name="AUTHNAME"]');
          if (authNameNode) {
            obj.user = authNameNode.getAttribute('value');
          }

          var authSecretNode =
            napAuthInfoNode.querySelector('parm[name="AUTHSECRET"]');
          if (authSecretNode) {
            obj.password = authSecretNode.getAttribute('value');
          }
        }
        return obj;
      }

      var parser = new DOMParser();
      var domDocument = parser.parseFromString(this._provisioningDoc,
                                               CONTENT_TYPE);
      this._applicationNodes =
        domDocument.querySelectorAll('characteristic[type="APPLICATION"]');
      this._napDefNodes =
        domDocument.querySelectorAll('characteristic[type="NAPDEF"]');
      this._pxLogicalNodes =
        domDocument.querySelectorAll('characteristic[type="PXLOGICAL"]');

      // The APPLICATION nodes can occur 0 or more times but it makes no sense
      // to continue when the current document doesn't have at least one one of
      // them.
      if (!this._applicationNodes) {
        return;
      }

      var napDefNode = null;
      var apn = null;
      var type = [];
      var proxy = null;

      var applicationNode = null;
      for (var j = 0; j < this._applicationNodes.length; j++) {
        applicationNode = this._applicationNodes[j];

        var appIdNode = null, appId = null;
        appIdNode = applicationNode.querySelector('parm[name="APPID"]');
        appId = appIdNode.getAttribute('value');

        var toProxyNodes = null;
        toProxyNodes =
          applicationNode.querySelectorAll('parm[name="TO-PROXY"]');

        var toNapIdNodes = null;
        toNapIdNodes =
          applicationNode.querySelectorAll('parm[name="TO-NAPID"]');

        var addrNode = null, addr = null;
        addrNode = applicationNode.querySelector('parm[name="ADDR"]');
        if (addrNode) {
          addr = addrNode.getAttribute('value');
        }

        // Only look for APPLICATION nodes for the Browsing Enabler and AC for
        // the Multimedia Messaging System Enabler
        if (appId && (appId !== 'w2') && (appId !== 'w4')) {
          continue;
        }

        if (!toNapIdNodes && !toProxyNodes) {
          // The TO-NAPID parameter refers to a network access point with a
          // matching NAPID parameter. At least we need one of them since it
          // links to the NAPDEF characteristic node containig the APN.

          // The TO-PROXY parameter refers to a logical proxy with a matching
          // PROXY-ID. The logical proxy might contain a phisical proxy which
          // might point to an APN.
          continue;
        }

        // Add the type for the APN relaying on the APPID param value. The type
        // will be added as an additional proprerty to the other APN properties.
        type = [];
        type.push(TYPE_MAPPING[appId]);

        if (toProxyNodes) {
          // If the application characteristic node points to a logical proxy
          // characteristic node let's find the APN through the physical
          // proxy characteristic nodes that the logical proxy must contain.
          for (var l = 0; l < toProxyNodes.length; l++) {
            var pxPhysicalNodes = this.getPxPhysicalNodes(toProxyNodes[l]);
            for (var m = 0; m < pxPhysicalNodes.length; m++) {
              proxy = parsePxPhysicalNode(pxPhysicalNodes[m],
                                          (TYPE_MAPPING[appId] === 'mms'));
              this._proxies.push(proxy);
              for (var n = 0; n < proxy['TO-NAPID'].length; n++) {
                napDefNode = this.getNapDefNode(proxy['TO-NAPID'][n]);
                apn = parseNapDefNode(napDefNode);
                // Add type property.
                apn.type = type;
                // Add mmsc property when MMS APN
                if ((TYPE_MAPPING[appId] === 'mms') && addr) {
                  apn.mmsc = addr;
                }
                this._apns.push(apn);
              }
            }
          }
        }
        if (toNapIdNodes) {
          for (var o = 0; o < toNapIdNodes.length; o++) {
            napDefNode = this.getNapDefNode(proxy['TO-NAPID'][o]);
            apn = parseNapDefNode(napDefNode);
            // Add type property.
            apn.type = type;
            this._apns.push(apn);
          }
        }
      } // for this._applicationNodes
    },

    /**
     * Gets the list of APN objects in the WAP provisioning document.
     *
     * @return {Array} The list of APN objects.
     */
    getApns: function ppd_getApns() {
      function addProperties(src, dst) {
        for (var key in src) {
          dst[key] = src[key];
        }
      }

      if (this._apnsReady) {
        return this._apns;
      }
      for (var i = 0; i < this._proxies.length; i++) {
        var proxy = this._proxies[i];
        for (var j = 0; j < proxy['TO-NAPID'].length; j++) {
          var TO_NAPID = proxy['TO-NAPID'][j];
          for (var k = 0; k < this._apns.length; k++) {
            var apn = this._apns[k];
            if (TO_NAPID === apn.NAPID) {
              addProperties(proxy, apn);
              break;
            }
          }
        }
      }

      this._apnsReady = true;
      return this._apns;
    }
  };

  /**
   * Parses a WAP provisioning document and returns the object holding the list
   * of APN objects in the document.
   *
   * @param {String} provisioningDoc The WAP provisioning document (XML string).
   *
   * @return {Object} A ParsedProvisioningDoc object.
   */
  ParsedProvisioningDoc.from = function ppd_from(provisioningDoc) {
    var obj = new ParsedProvisioningDoc(provisioningDoc);
    obj.parse();

    return obj;
  };

  exports.ParsedProvisioningDoc = ParsedProvisioningDoc;
})(window);
