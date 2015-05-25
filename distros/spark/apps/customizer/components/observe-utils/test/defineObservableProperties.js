/*global ObserveUtils, describe, it, expect , sinon*/

describe('defineObservableProperties', function () {
    'use strict';

    function getPropertyDescriptor(target, name) {
        var pd = Object.getOwnPropertyDescriptor(target, name);
        var proto = Object.getPrototypeOf(target);
        while (typeof pd === 'undefined' && proto !== null) {
            pd = Object.getOwnPropertyDescriptor(proto, name);
            proto = Object.getPrototypeOf(proto);
        }
        return pd;
    }

    function testIsObject(testFunc) {
        expect(function () {
            testFunc(5);
        }).to.throwException(function (e) {
                expect(e).to.be.a(TypeError);
            });

        expect(function () {
            testFunc('string');
        }).to.throwException(function (e) {
            expect(e).to.be.a(TypeError);
        });

        expect(function () {
            testFunc(NaN);
        }).to.throwException(function (e) {
            expect(e).to.be.a(TypeError);
        });

        expect(function () {
            testFunc(null);
        }).to.throwException(function (e) {
            expect(e).to.be.a(TypeError);
        });

        expect(function () {
            testFunc(undefined);
        }).to.throwException(function (e) {
            expect(e).to.be.a(TypeError);
        });

        expect(function () {
            testFunc({});
        }).to.not.throwException();

        expect(function () {
            testFunc(function () {});
        }).to.not.throwException();
    }



    it('should throw an error when passing an non object at first parameter', function () {
        testIsObject(function (target) {
            ObserveUtils.defineObservableProperties(target);
        });
    });

    it('should define getter/setter on object', function () {
        var object = {};

        ObserveUtils.defineObservableProperties(object, 'property');
        expect(object).to.have.property('property');

        var descriptor = Object.getOwnPropertyDescriptor(object, 'property');
        expect(descriptor).to.have.property('get');
        expect(descriptor).to.have.property('set');
    });

    it('should define multiple property on rest parameter', function () {
        var object = {};
        ObserveUtils.defineObservableProperties(object, 'property', 'property1', 'property2');

        expect(object).to.have.property('property');
        expect(object).to.have.property('property1');
        expect(object).to.have.property('property2');
    });


    it('should conserve the original value', function () {
        var value = {};
        var object = {property: value};
        ObserveUtils.defineObservableProperties(object, 'property');

        expect(object.property).to.be.equal(value);
    });

    it('should not redefine property with getter/setter', function () {

        var getter = function () {
        };
        var setter = function () {
        };

        var object = {};
        Object.defineProperty(object, 'property', {
            get: getter,
            configurable: true,
            enumerable: true
        });

        ObserveUtils.defineObservableProperties(object, 'property');
        expect(Object.getOwnPropertyDescriptor(object, 'property').get).to.be.equal(getter);

        var object1 = {};
        Object.defineProperty(object1, 'property', {
            set: setter,
            configurable: true,
            enumerable: true
        });
        expect(Object.getOwnPropertyDescriptor(object1, 'property').set).to.be.equal(setter);
    });

    it('should not redefine property with getter/setter defined in the prototype chain', function () {

        var getter = function () {
        };
        var proto = {};

        Object.defineProperty(proto, 'property', {
            get: getter,
            configurable: true,
            enumerable: true
        });

        var object = Object.create(proto);

        expect(Object.getOwnPropertyDescriptor(object, 'property')).to.be.equal(undefined);
        expect(getPropertyDescriptor(object, 'property').get).to.be.equal(getter);
    });


    it('should not define other enumerable property', function () {

        var object = {};

        ObserveUtils.defineObservableProperties(object, 'property');
        expect(object).to.be.eql({property: undefined});

    });

    it('should define property that notify when they are updated', function () {

        var object = {},
            notifier = Object.getNotifier(object);
        notifier.notify = sinon.spy();
        ObserveUtils.defineObservableProperties(object, 'property');
        object.property = 5;

        expect(notifier.notify.calledOnce).to.be.ok();
        expect(notifier.notify.args[0][0]).to.be.eql({
            type: 'update',
            name: 'property',
            oldValue: undefined
        });


    });

    it('should define property that notify when they are updated, only if value has changed', function () {
        var object = {},
            notifier = Object.getNotifier(object);
        notifier.notify = sinon.spy();
        ObserveUtils.defineObservableProperties(object, 'property');
        object.property = 5;
        object.property = 5;

        expect(notifier.notify.calledOnce).to.be.ok();
        expect(notifier.notify.args[0][0]).to.be.eql({
            type: 'update',
            name: 'property',
            oldValue: undefined
        });
    });

});