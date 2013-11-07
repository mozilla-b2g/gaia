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
  });
});
