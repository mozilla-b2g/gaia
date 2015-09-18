/* global sinon */
/* exported MockDom */
'use strict';

var fakeIconBlob = 'blob:d3958f5c-0777-0845-9dcf-2cb28783acaf';
var MockDom = {
  setup: () => {
    MockDom.createElementStub = sinon.stub(document, 'createElement');
    MockDom.createElementStub.withArgs('canvas').returns({
      getContext: ()  => {
        return {
          drawImage: () => {
          }
        };
      },
      toBlob: (cb) => {
        cb(fakeIconBlob);
      }
    });

    var imgElement = {
      get onload() {
        return imgOnloadCb;
      },
      set onload(cb) {
        imgOnloadCb = cb;
      },
      onerror: null,
      width: 100,
      src: ''
    };
    var imgOnloadCb = null;
    var imgOnloadCbTimeout = null;
    MockDom.createElementStub.withArgs('img').returns(imgElement);
    MockDom.mImgOnload = () => {
      imgOnloadCbTimeout = setTimeout(() => {
        imgOnloadCb();
        imgOnloadCb = null;
        clearTimeout(imgOnloadCbTimeout);
      });
    };

    MockDom.appendChildStub = sinon.stub(Node.prototype, 'appendChild');
    MockDom.querySelectorStub = sinon.stub(HTMLElement.__proto__.prototype,
      'querySelector').returns(imgElement);

    MockDom.createObjectURLStub = sinon.stub(URL, 'createObjectURL')
      .returns('http://' + fakeIconBlob);
  },

  teardown: () => {
    MockDom.createElementStub.restore();
    MockDom.appendChildStub.restore();
    MockDom.querySelectorStub.restore();
    MockDom.createObjectURLStub.restore();
  }
};
