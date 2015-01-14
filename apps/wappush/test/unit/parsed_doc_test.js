/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global ParsedProvisioningDoc */

'use strict';

requireApp('wappush/js/parsed_doc.js');

suite('ParsedProvisioningDoc >', function() {

  suite('ParsedProvisioningDoc.from()', function() {

    test('Empty document. List of APN is empty', function() {
      var parsedProvisioningDoc;
      var provisioningDoc = '';
      parsedProvisioningDoc = ParsedProvisioningDoc.from(provisioningDoc);
      assert.lengthOf(parsedProvisioningDoc.getApns(), 0);
    });

    test('TEF document with default APN', function() {
      var parsedProvisioningDoc;
      var provisioningDoc =
        '<wap-provisioningdoc>' +
          '<characteristic type="PXLOGICAL">' +
            '<parm name="PROXY-ID" value="10.138.255.133"/>' +
            '<parm name="NAME" value="Telefonica"/>' +
            '<parm name="STARTPAGE" value="http://www.movistar.es"/>' +
            '<characteristic type="PORT">' +
              '<parm name="PORTNBR" value="8080"/>' +
              '<parm name="SERVICE" value="CO-WSP"/>' +
            '</characteristic>' +
            '<characteristic type="PXPHYSICAL">' +
              '<parm name="PHYSICAL-PROXY-ID" value="PRX1"/>' +
              '<parm name="PXADDR" value="10.138.255.133"/>' +
              '<parm name="PXADDRTYPE" value="IPV4"/>' +
              '<parm name="TO-NAPID" value="NAP1"/>' +
              '<characteristic type="PORT">' +
                '<parm name="PORTNBR" value="8080"/>' +
                '<parm name="SERVICE" value="CO-WSP"/>' +
              '</characteristic>' +
            '</characteristic>' +
          '</characteristic>' +
          '<characteristic type="NAPDEF">' +
            '<parm name="NAPID" value="NAP1"/>' +
            '<parm name="BEARER" value="GSM-GPRS"/>' +
            '<parm name="NAME" value="Telefonica"/>' +
            '<parm name="NAP-ADDRESS" value="telefonica.es"/>' +
            '<parm name="NAP-ADDRTYPE" value="APN"/>' +
            '<characteristic type="NAPAUTHINFO">' +
              '<parm name="AUTHTYPE" value="PAP"/>' +
              '<parm name="AUTHNAME" value="telefonica"/>' +
              '<parm name="AUTHSECRET" value="telefonica"/>' +
            '</characteristic>' +
          '</characteristic>' +
          '<characteristic type="APPLICATION">' +
            '<parm name="APPID" value="w2"/>' +
            '<parm name="TO-PROXY" value="10.138.255.133"/>' +
            '<parm name="NAME" value="Telefonica"/>' +
          '</characteristic>' +
        '</wap-provisioningdoc>';

      parsedProvisioningDoc = ParsedProvisioningDoc.from(provisioningDoc);
      assert.lengthOf(parsedProvisioningDoc.getApns(), 1);
    });

    test('CHT document with default and mms APN', function() {
      var parsedProvisioningDoc;
      var provisioningDoc =
        '<wap-provisioningdoc>' +
          '<characteristic type="BOOTSTRAP">' +
            '<parm name="NAME" value="CHT_emome"/>' +
          '</characteristic>' +
          '<characteristic type="APPLICATION">' +
            '<parm name="APPID" value="w2"/>' +
            '<parm name="TO-PROXY" value="WPROXY"/>' +
            '<parm name="NAME" value="CHT_emome"/>' +
            '<characteristic type="RESOURCE">' +
              '<parm name="URI" value="http://wap.emome.net/"/>' +
              '<parm name="NAME" value="CHT_emome"/>' +
              '<parm name="STARTPAGE"/>' +
            '</characteristic>' +
          '</characteristic>' +
          '<characteristic type="APPLICATION">' +
            '<parm name="APPID" value="w4"/>' +
            '<parm name="TO-PROXY" value="MPROXY"/>' +
            '<parm name="ADDR" value="http://mms:8002"/>' +
          '</characteristic>' +
          '<characteristic type="PXLOGICAL">' +
            '<parm name="PROXY-ID" value="WPROXY"/>' +
            '<parm name="NAME" value="CHT_emome"/>' +
            '<parm name="STARTPAGE" value="http://wap.emome.net/"/>' +
            '<characteristic type="PXPHYSICAL">' +
              '<parm name="PHYSICAL-PROXY-ID" value="PROXY1"/>' +
              '<parm name="PXADDR" value="10.1.1.1"/>' +
              '<parm name="PXADDRTYPE" value="IPV4"/>' +
              '<parm name="TO-NAPID" value="CHT_emome"/>' +
              '<characteristic type="PORT">' +
                '<parm name="PORTNBR" value="8080"/>' +
              '</characteristic>' +
            '</characteristic>' +
          '</characteristic>' +
          '<characteristic type="PXLOGICAL">' +
            '<parm name="PROXY-ID" value="MPROXY"/>' +
            '<parm name="NAME" value="CHT_MMS"/>' +
            '<characteristic type="PXPHYSICAL">' +
              '<parm name="PHYSICAL-PROXY-ID" value="PROXY2"/>' +
              '<parm name="PXADDR" value="10.1.1.1"/>' +
              '<parm name="PXADDRTYPE" value="IPV4"/>' +
              '<parm name="TO-NAPID" value="CHT_MMS"/>' +
              '<characteristic type="PORT">' +
                '<parm name="PORTNBR" value="8080"/>' +
              '</characteristic>' +
            '</characteristic>' +
          '</characteristic>' +
          '<characteristic type="NAPDEF">' +
            '<parm name="NAPID" value="CHT_emome"/>' +
            '<parm name="NAME" value="CHT_emome"/>' +
            '<parm name="BEARER" value="GSM-GPRS"/>' +
            '<parm name="NAP-ADDRESS" value="emome"/>' +
            '<parm name="NAP-ADDRTYPE" value="APN"/>' +
          '</characteristic>' +
          '<characteristic type="NAPDEF">' +
            '<parm name="NAPID" value="CHT_MMS"/>' +
            '<parm name="NAME" value="CHT_MMS"/>' +
            '<parm name="BEARER" value="GSM-GPRS"/>' +
            '<Parm name="NAP-ADDRESS" value="emome"/>' +
            '<parm name="NAP-ADDRTYPE" value="APN"/>' +
          '</characteristic>' +
        '</wap-provisioningdoc>';

      parsedProvisioningDoc = ParsedProvisioningDoc.from(provisioningDoc);
      assert.lengthOf(parsedProvisioningDoc.getApns(), 2);
    });

    test('TEF document without APPLICATION nodes', function() {
      var parsedProvisioningDoc;
      var provisioningDoc =
        '<wap-provisioningdoc>' +
          '<characteristic type="PXLOGICAL">' +
            '<parm name="PROXY-ID" value="10.138.255.133"/>' +
            '<parm name="NAME" value="Telefonica"/>' +
            '<parm name="STARTPAGE" value="http://www.movistar.es"/>' +
            '<characteristic type="PORT">' +
              '<parm name="PORTNBR" value="8080"/>' +
              '<parm name="SERVICE" value="CO-WSP"/>' +
            '</characteristic>' +
            '<characteristic type="PXPHYSICAL">' +
              '<parm name="PHYSICAL-PROXY-ID" value="PRX1"/>' +
              '<parm name="PXADDR" value="10.138.255.133"/>' +
              '<parm name="PXADDRTYPE" value="IPV4"/>' +
              '<parm name="TO-NAPID" value="NAP1"/>' +
              '<characteristic type="PORT">' +
                '<parm name="PORTNBR" value="8080"/>' +
                '<parm name="SERVICE" value="CO-WSP"/>' +
              '</characteristic>' +
            '</characteristic>' +
          '</characteristic>' +
          '<characteristic type="NAPDEF">' +
            '<parm name="NAPID" value="NAP1"/>' +
            '<parm name="BEARER" value="GSM-GPRS"/>' +
            '<parm name="NAME" value="Telefonica"/>' +
            '<parm name="NAP-ADDRESS" value="telefonica.es"/>' +
            '<parm name="NAP-ADDRTYPE" value="APN"/>' +
            '<characteristic type="NAPAUTHINFO">' +
              '<parm name="AUTHTYPE" value="PAP"/>' +
              '<parm name="AUTHNAME" value="telefonica"/>' +
              '<parm name="AUTHSECRET" value="telefonica"/>' +
            '</characteristic>' +
          '</characteristic>' +
        '</wap-provisioningdoc>';

      parsedProvisioningDoc = ParsedProvisioningDoc.from(provisioningDoc);
      assert.lengthOf(parsedProvisioningDoc.getApns(), 0);
    });

    test('TEF document without valid APPLICATION nodes', function() {
      var parsedProvisioningDoc;
      var provisioningDoc =
        '<wap-provisioningdoc>' +
          '<characteristic type="NAPDEF">' +
            '<parm name="NAPID" value="Yahoo"/>' +
            '<parm name="BEARER" value="GSM-GPRS"/>' +
            '<parm name="NAME" value="Yahoo"/>' +
            '<parm name="NAP-ADDRESS" value="movistar.es"/>' +
            '<parm name="NAP-ADDRTYPE" value="APN"/>' +
            '<characteristic type="NAPAUTHINFO">' +
              '<parm name="AUTHTYPE" value="PAP"/>' +
              '<parm name="AUTHNAME" value=""/>' +
              '<parm name="AUTHSECRET" value=""/>' +
            '</characteristic>' +
          '</characteristic>' +
          '<characteristic type="APPLICATION">' +
            '<parm name="APPID" value="25"/>' +
            '<parm name="PROVIDER-ID" value="Yahoo"/>' +
            '<parm name="NAME" value="Yahoo"/>' +
            '<parm name="FROM" value="owdqa_test1@yahoo.es"/>' +
            '<parm name="TO-NAPID" value="Yahoo"/>' +
            '<characteristic type="APPADDR">' +
              '<parm name="ADDR" value="smtp.yahoo.es"/>' +
              '<characteristic type="PORT">' +
                '<parm name="PORTNBR" value="25"/>' +
              '</characteristic>' +
            '</characteristic>' +
          '</characteristic>' +
          '<characteristic type="APPLICATION">' +
            '<parm name="APPID" value="110"/>' +
            '<parm name="PROVIDER-ID" value="Yahoo"/>' +
            '<parm name="NAME" value="Yahoo"/>' +
            '<parm name="TO-NAPID" value="Yahoo"/>' +
            '<characteristic type="APPADDR">' +
              '<parm name="ADDR" value="pop.yahoo.es"/>' +
              '<characteristic type="PORT">' +
                '<parm name="PORTNBR" value="110"/>' +
              '</characteristic>' +
            '</characteristic>' +
            '<characteristic type="APPAUTH">' +
              '<parm name="AAUTHNAME" value="owdqa_test1@yahoo.es"/>' +
              '<parm name="AAUTHSECRET"/>' +
            '</characteristic>' +
          '</characteristic>' +
        '</wap-provisioningdoc>';

      parsedProvisioningDoc = ParsedProvisioningDoc.from(provisioningDoc);
      assert.lengthOf(parsedProvisioningDoc.getApns(), 0);
    });

    test('DT document without TO-PROXY nodes in the APPLICATION nodes',
      function() {
        var parsedProvisioningDoc;
        var provisioningDoc =
          '<wap-provisioningdoc version="1.0">' +
            '<characteristic type="BOOTSTRAP">' +
              '<parm name="NAME" value="T-Mobile Internet"/>' +
            '</characteristic>' +
            '<characteristic type="NAPDEF">' +
              '<parm name="NAPID" value="internet-apn"/>' +
              '<parm name="BEARER" value="GSM-GPRS"/>' +
              '<parm name="NAME" value="T-Mobile Internet"/>' +
              '<parm name="NAP-ADDRTYPE" value="APN"/>' +
              '<parm name="NAP-ADDRESS" value="internet.t-mobile"/>' +
              '<parm name="LINGER" value="150"/>' +
              '<parm name="DNS-ADDR" value="193.254.160.001"/>' +
              '<parm name="DNS-ADDR" value="193.254.160.130"/>' +
              '<characteristic type="NAPAUTHINFO">' +
                '<parm name="AUTHTYPE" value="PAP"/>' +
                '<parm name="AUTHNAME" value="t-mobile"/>' +
                '<parm name="AUTHSECRET" value="tm"/>' +
              '</characteristic>' +
            '</characteristic>' +
            '<characteristic type="APPLICATION">' +
              '<parm name="APPID" value="w2"/>' +
              '<parm name="TO-NAPID" value="internet-apn"/>' +
              '<parm name="NAME" value="T-Mobile Internet"/>' +
              '<characteristic type="RESOURCE">' +
                '<parm name="NAME" value="Start page"/>' +
                '<parm name="URI" value="http://www.t-mobile-favoriten.de"/>' +
                '<parm name="STARTPAGE"/>' +
              '</characteristic>' +
            '</characteristic>' +
          '</wap-provisioningdoc>';
        parsedProvisioningDoc = ParsedProvisioningDoc.from(provisioningDoc);
        assert.lengthOf(parsedProvisioningDoc.getApns(), 1);
    });
    test('Document without matched PROXY-ID node for a TO-PROXY node',
      function() {
        var parsedProvisioningDoc;
        var provisioningDoc =
          '<wap-provisioningdoc version="1.0">' +
            '<characteristic type="PXLOGICAL">' +
              '<parm name="PROXY-ID" value="www.operator.com"/>' +
              '<parm name="NAME" value="GW WAP"/>' +
              '<characteristic type="PXPHYSICAL">' +
                '<parm name="PHYSICAL-PROXY-ID" value="PROXY_WAP_3"/>' +
                '<parm name="PXADDR" value="172.150.70.5"/>' +
                '<parm name="PXADDRTYPE" value="IPV4"/>' +
                '<parm name="TO-NAPID" value="WAP_GPRS"/>' +
                '<parm name="TO-NAPID" value="WAP_CSD"/>' +
              '</characteristic>' +
            '</characteristic>' +
            '<characteristic type="NAPDEF">' +
              '<parm name="NAPID" value="WAP_GPRS"/>' +
              '<parm name="BEARER" value="GSM-GPRS"/>' +
              '<parm name="NAME" value="operator GPRS"/>' +
              '<parm name="NAP-ADDRESS" value="wap.operator.com"/>' +
              '<parm name="NAP-ADDRTYPE" value="APN"/>' +
              '<characteristic type="NAPAUTHINFO">' +
                '<parm name="AUTHTYPE" value="PAP"/>' +
                '<parm name="AUTHNAME" value="WAPOP"/>' +
                '<parm name="AUTHSECRET" value="WAPOP"/>' +
              '</characteristic>' +
            '</characteristic>' +
            '<characteristic type="NAPDEF">' +
              '<parm name="NAPID" value="WAP_GPRS"/>' +
              '<parm name="BEARER" value="GSM-GPRS"/>' +
              '<parm name="NAME" value="operator GPRS"/>' +
              '<parm name="NAP-ADDRESS" value="wapOP.operator.com"/>' +
              '<parm name="NAP-ADDRTYPE" value="APN"/>' +
              '<characteristic type="NAPAUTHINFO">' +
                '<parm name="AUTHTYPE" value="PAP"/>' +
                '<parm name="AUTHNAME" value="WAPOP"/>' +
                '<parm name="AUTHSECRET" value="WAPOP"/>' +
              '</characteristic>' +
            '</characteristic>' +
            '<characteristic type="APPLICATION">' +
              '<parm name="APPID" value="w2"/>' +
              '<parm name="NAME" value="Operator-portal"/>' +
              '<parm name="TO-PROXY" value="www.operator.com"/>' +
              '<characteristic type="RESOURCE">' +
                '<parm name="URI" value="http://wap.operator_portal.com"/>' +
                '<parm name="NAME" value="Operator portal"/>' +
                '<parm name="STARTPAGE"/>' +
              '</characteristic>' +
            '</characteristic>' +
            '<characteristic type="APPLICATION">' +
              '<parm name="APPID" value="w2"/>' +
              '<parm name="NAME" value="Operator-portal"/>' +
              '<parm name="TO-PROXY" value="www.wap.operator.com"/>' +
            '</characteristic>' +
          '</wap-provisioningdoc>';
        parsedProvisioningDoc = ParsedProvisioningDoc.from(provisioningDoc);
        assert.lengthOf(parsedProvisioningDoc.getApns(), 1);
    });
    test('Document with same appid different provider id',
      function() {
        var parsedProvisioningDoc;
        var provisioningDoc =
          '<wap-provisioningdoc>' +
            '<characteristic type="BOOTSTRAP">' +
              '<parm name="NAME" value="cmccwap"/>' +
              '<parm name="PROXY-ID" value="cmccwap_Proxy"/>' +
            '</characteristic>' +
            '<characteristic type="NAPDEF">' +
              '<parm name="NAME" value="cmccwap"/>' +
              '<parm name="NAPID" value="cmccwap_NAPID"/>' +
              '<parm name="BEARER" value="GSM-GPRS"/>' +
              '<parm name="NAP-ADDRESS" value="cmwap_01049"/>' +
              '<parm name="NAP-ADDRTYPE" value="APN"/>' +
            '</characteristic>' +
            '<characteristic type="PXLOGICAL">' +
              '<parm name="NAME" value="cmccwap_1"/>' +
              '<parm name="PROXY-ID" value="cmccwap_Proxy_1"/>' +
              '<parm name="STARTPAGE" value="http://wap.google.com"/>' +
              '<characteristic type="PXPHYSICAL">' +
                '<parm name="PHYSICAL-PROXY-ID" value="cmccwap_PhProxy"/>' +
                '<parm name="PXADDR" value="10.0.0.172"/>' +
                '<parm name="PXADDRTYPE" value="IPV4"/>' +
                '<parm name="TO-NAPID" value="cmccwap_NAPID"/>' +
                '<characteristic type="PORT">' +
                  '<parm name="PORTNBR" value="9201"/>' +
                  '<parm name="SERVICE" value="CO-WSP"/>' +
                '</characteristic>' +
              '</characteristic>' +
            '</characteristic>' +
            '<characteristic type="PXLOGICAL">' +
              '<parm name="NAME" value="cmccwap_2"/>' +
              '<parm name="PROXY-ID" value="cmccwap_Proxy_2"/>' +
              '<parm name="STARTPAGE" value="http://wap.163.com"/>' +
              '<characteristic type="PXPHYSICAL">' +
                '<parm name="PHYSICAL-PROXY-ID" value="cmccwap_PhProxy"/>' +
                '<parm name="PXADDR" value="10.0.0.172"/>' +
                '<parm name="PXADDRTYPE" value="IPV4"/>' +
                '<parm name="TO-NAPID" value="cmccwap_NAPID"/>' +
                '<characteristic type="PORT">' +
                  '<parm name="PORTNBR" value="9203"/>' +
                  '<parm name="SERVICE" value="CO-SEC-WSP"/>' +
                '</characteristic>' +
              '</characteristic>' +
            '</characteristic>' +
            '<characteristic type="APPLICATION">' +
              '<parm name="APPID" value="w2"/>' +
              '<parm name="PROVIDER-ID" value="460001"/>' +
              '<parm name="NAME" value="cmccwap"/>' +
              '<parm name="TO-PROXY" value="cmccwap_Proxy_1"/>' +
            '</characteristic>' +
            '<characteristic type="APPLICATION">' +
              '<parm name="APPID" value="w2"/>' +
              '<parm name="PROVIDER-ID" value="460002"/>' +
              '<parm name="NAME" value="cmccwap"/>' +
              '<parm name="TO-PROXY" value="cmccwap_Proxy_2"/>' +
            '</characteristic>' +
          '</wap-provisioningdoc>' +;
        parsedProvisioningDoc = ParsedProvisioningDoc.from(provisioningDoc);
        assert.lengthOf(parsedProvisioningDoc.getApns(), 2);
    });
  });
});
