//    Copyright 2012 Kap IT (http://www.kapit.fr/)
//
//    Licensed under the Apache License, Version 2.0 (the 'License');
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an 'AS IS' BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.
//    Author : François de Campredon (http://francois.de-campredon.fr/),

/*global ObserveUtils, describe, it, expect , beforeEach, afterEach, sinon */


describe('List', function () {
    'use strict';
    var List = ObserveUtils.List;

    describe('Array behaviours', function () {
        function isValidNumberTest(testFunction) {
            expect(function () {
                testFunction('foo');
            }).to.throwException(function (e) {
                    expect(e).to.be.a(RangeError);
                });


            expect(function () {
                testFunction({});
            }).to.throwException(function (e) {
                    expect(e).to.be.a(RangeError);
                });


            expect(function () {
                testFunction(undefined);
            }).to.throwException(function (e) {
                    expect(e).to.be.a(RangeError);
                });


            expect(function () {
                testFunction(NaN);
            }).to.throwException(function (e) {
                    expect(e).to.be.a(RangeError);
                });


            expect(function () {
                testFunction(Infinity);
            }).to.throwException(function (e) {
                    expect(e).to.be.a(RangeError);
                });


            expect(function () {
                testFunction(-1);
            }).to.throwException(function (e) {
                    expect(e).to.be.a(RangeError);
                });

            expect(function () {
                testFunction(0.1);
            }).to.throwException(function (e) {
                    expect(e).to.be.a(RangeError);
                });


            expect(function () {
                testFunction(1);
            }).to.not.throwException();

            expect(function () {
                testFunction('1');
            }).to.not.throwException();

            expect(function () {
                testFunction(null);
            }).to.not.throwException();

            expect(function () {
                testFunction(false);
            }).to.not.throwException();
        }

        function isCallableTest(testFunction) {
            expect(function () {
                testFunction();
            }).to.throwException(function (e) {
                expect(e).to.be.a(TypeError);
            });

            expect(function () {
                testFunction({});
            }).to.throwException(function (e) {
                expect(e).to.be.a(TypeError);
            });

            expect(function () {
                testFunction(null);
            }).to.throwException(function (e) {
                expect(e).to.be.a(TypeError);
            });

            expect(function () {
                testFunction(0);
            }).to.throwException(function (e) {
                expect(e).to.be.a(TypeError);
            });

            expect(function () {
                testFunction(' ');
            }).to.throwException(function (e) {
                expect(e).to.be.a(TypeError);
            });
        }

        describe('Constructor', function () {

            it('should provide a constructor that take a length as parameter', function () {
                var length = Math.ceil(Math.random() * 100);
                var list = new List(length);
                expect(list.length).to.be(length);
                expect(Object.keys(list)).to.be.eql([]);
            });


            it('should provide a constructor that take a range of object as arguments and add it to the object', function () {
                var list = new List(undefined, 'a', 'b', {});
                expect(list.length).to.be(4);
                expect(list).to.be.eql([undefined, 'a', 'b', {}]);
            });

            it('should behave the same with or without the "new" operator', function () {
                expect(List(1)).to.be.eql(new List(1));
                expect(List('a', 'b', 'c')).to.be.eql(new List('a', 'b', 'c'));
            });

        });


        describe('toString', function () {
            var list;
            beforeEach(function () {
                list = List('1', '2', '3', '4');
            });

            it('toString result should be the same for similar array', function () {
                expect(list.toString()).to.be(['1', '2', '3', '4'].toString());
            });

        });


        describe('length property', function () {
            var list;
            beforeEach(function () {
                list = List('1', '2', '3', '4');
            });

            it('should only be assignable with positive finite integer', function () {

                isValidNumberTest(function (value) {
                    list.length = value;
                });

            });


            it('should destroy index when decreased', function () {
                list.length = 2;
                expect(list).to.be.eql(['1', '2']);
            });

        });

        describe('set method', function () {
            var list;
            var index;
            beforeEach(function () {
                list = List();
                index = Math.ceil(Math.random() * 100);
            });

            it('should only accept as index positive finite integer', function () {
                isValidNumberTest(function (value) {
                    list.set(value);
                });
            });

            it('should set a property at the desired index', function () {
                list.set(index, 'foo');
                expect(list[index]).to.be('foo');
            });


            it('should increase the length when setting a property out of bounds', function () {
                list.set(index, 'foo');
                expect(list.length).to.be(index + 1);
            });
        });

        describe('delete method', function () {

            var list;
            var index;
            beforeEach(function () {
                list = List();
                index = Math.ceil(Math.random() * 100);
            });

            it('should only accept as index positive finite integer', function () {
                isValidNumberTest(function (value) {
                    list.delete(value);
                });
            });

            it('should delete property at the given index', function () {
                list.set(index, 'hello');
                list.delete(index);
                expect(list).to.be.eql([]);
            });
        });


        describe('toArray method', function () {

            it('should return an array identical to the original list', function () {
                var list = List('1', {}, 'g', 3, undefined, null);
                var array = list.toArray();
                expect(array).to.be.an('array');
                expect(array).to.be.eql(list);
            });

        });

        describe('concat method', function () {
            var list;
            beforeEach(function () {
                list = List(1, 2);
            });


            it('should duplicate the original list if no parameter are passed', function () {
                var newList = list.concat();
                expect(newList).to.be.a(List);
                expect(newList).to.be.eql(list);
                expect(newList).not.to.be(list);
            });

            it('should return a concatenation of the original list an from an array passed as parameter', function () {
                var newList = list.concat(['1', '2', '3']);
                expect(newList).to.be.eql([1, 2, '1', '2', '3']);
            });

            it('should return a concatenation of the original list an from another list passed as parameter', function () {
                var newList = list.concat(List('1', '2', '3'));
                expect(newList).to.be.eql([1, 2, '1', '2', '3']);
            });

            it('should return a list augmented with every non array non list parameter', function () {
                var newList = list.concat('string', {}, 5, null, undefined);
                expect(newList).to.be.eql([1, 2, 'string', {}, 5, null, undefined]);
            });

            it('should detect array and List parameter anywhere in the arguments list', function () {
                var newList = list.concat('string', [
                    {},
                    5,
                    null
                ], Infinity, List(undefined, []));
                expect(newList).to.be.eql([1, 2, 'string', {}, 5, null, Infinity, undefined, []]);
            });
        });


        describe('join method', function () {
            it('should return a string chain composed of the concatation of each element separated by the first parameter passed', function () {
                expect(List(1, 2, 3).join('#')).to.be('1#2#3');
            });

            it('should use comma if not separator are given', function () {
                expect(List(1, 2, 3).join()).to.be('1,2,3');
            });
        });

        describe('pop method', function () {
            it('should do nothing on empty list', function () {
                var list = List();
                expect(list.pop()).to.be(undefined);
                expect(list).to.be.eql([]);
            });

            it('should remove the last item of the list and return it', function () {
                var obj = {};
                var list = List(1, 2, obj);
                expect(list.pop()).to.be(obj);
                expect(list).to.be.eql([1, 2]);
            });

            it('should decrease the length', function () {
                var list = List(1, 2);
                list.pop();
                expect(list.length).to.be(1);
            });
        });


        describe('push  method', function () {
            var list;
            var array;
            beforeEach(function () {
                var l = Math.ceil(Math.random() * 100);
                array = [];
                for (var i = 0; i < l; i++) {
                    array.push(Math.random());
                }
                list = List.fromArray(array);
            });
            it('should do nothing if no parameter are passed', function () {
                list.push();
                expect(list).to.be.eql(array);
                expect(list.length).to.be(array.length);
            });

            it('should return the length', function () {
                expect(list.push()).to.be(list.length);
            });

            it('should add any object passed as parameter', function () {
                var obj = {};
                list.push(1, obj);
                expect(list).to.be.eql(array.concat(1, obj));
            });

            it('should increase the length', function () {
                list.push(1, 2);
                expect(list.length).to.be(array.length + 2);
            });
        });


        describe('reverse method', function () {
            it('should reverse the array', function () {
                var l = Math.ceil(Math.random() * 100);
                var array = [];
                for (var i = 0; i < l; i++) {
                    array.push(Math.random());
                }
                var list = List.fromArray(array);
                list.reverse();
                expect(list).to.be.eql(array.reverse());
            });

            it('should return the list', function () {
                var list = List();
                expect(list.reverse()).to.be(list);
            });
        });


        describe('shift method', function () {
            it('should do nothing on empty list', function () {
                var list = List();
                expect(list.shift()).to.be(undefined);
                expect(list).to.be.eql([]);
            });

            it('should remove the firdt item of the list and return it', function () {
                var obj = {};
                var list = List(obj, 1, 2);
                expect(list.shift()).to.be(obj);
                expect(list).to.be.eql([1, 2]);
            });

            it('should decrease the length', function () {
                var list = List(1, 2);
                list.shift();
                expect(list.length).to.be(1);
            });
        });


        describe('slice method', function () {
            var list;
            beforeEach(function () {
                list = List(1, 2, 3, 4);
            });


            it('should duplicate the original list if no parameter are passed', function () {
                var newList = list.slice();
                expect(newList).to.be.a(List);
                expect(newList).to.be.eql(list);
                expect(newList).not.to.be(list);
            });


            it('should extract a list, subset of the original list, starting at the index of the first parameter to the index of the second parameter ', function () {
                var newList = list.slice(1, 3);
                expect(newList).to.be.eql([2, 3]);
            });

            it('should extract a list, subset of the original list, starting at the index of the first parameter to the end of the list, if the second parameter is not defined', function () {
                var newList = list.slice(1);
                expect(newList).to.be.eql([2, 3, 4]);
            });

            it('should extract a list, subset of the original list, starting at the begining of the lst to the index of the first parameter, if the first parameter is not defined', function () {
                var newList = list.slice(undefined, 3);
                expect(newList).to.be.eql([1, 2, 3]);
            });

            it('should not alter the orginial list', function () {
                list.slice(1, 3);
                expect(list).to.be.eql([1, 2, 3, 4]);
            });
        });

        describe('sort method', function () {
            it('should do nothing on empty list', function () {
                var list = List();
                list.sort();
                expect(list).to.be.eql([]);
            });


            it('should return the list', function () {
                var list = List();
                expect(list.sort()).to.be(list);
            });


            it('should sort alphabeticly the content if no parameters are given', function () {
                var list = List('b', 'e', 'a', 'g');
                expect(list.sort()).to.be.eql(['a', 'b', 'e', 'g']);
            });


            it('should sort the content according to the given sort function if given', function () {
                var list = List(10, 1, 2, 9, 11, 15);
                expect(list.sort(function (a, b) {
                    return a - b;
                })).to.be.eql([1, 2, 9, 10, 11, 15]);
            });
        });


        describe('splice method', function () {

            var list;
            beforeEach(function () {
                list = List(1, 2, 3, 4, 5);
            });

            it('should do nothing on empty list', function () {
                var list = List();
                list.splice();
                expect(list).to.be.eql([]);
            });

            it('should remove x item from the list at the index given as first parameter x being the second parameter', function () {
                list.splice(1, 2);
                expect(list).to.be.eql([1, 4, 5]);
            });

            it('should do nothing if no parameters are given', function () {
                list.splice();
                expect(list).to.be.eql([1, 2, 3, 4, 5]);
            });

            it('should remove all item from the list starting at the index given as first parameter if the second parameter is not defined', function () {
                list.splice(1);
                expect(list).to.be.eql([1]);
            });

            it('should remove x item from the list starting at the index 0 x being the second parameter, if the first parameters is not defined', function () {
                list.splice(undefined, 2);
                expect(list).to.be.eql([3, 4, 5]);
            });

            it('should return the removed item', function () {
                expect(list.splice(1, 2)).to.be.eql([2, 3]);
            });


            it('should all item passed as rest parameters at the given at the first parameter', function () {
                var obj = {}, array = [];
                list.splice(1, 2, 'g', obj, array);
                expect(list).to.be.eql([1, 'g', obj, array, 4, 5]);
            });


            it('should decrease the length if item are removed', function () {
                list.splice(1, 2);
                expect(list.length).to.be(3);
            });

            it('should increase the length if item are removed', function () {
                list.splice(1, 2, 1, 2, 3);
                expect(list.length).to.be(6);
            });
        });


        describe('unshift method', function () {

            var list;
            var array;
            beforeEach(function () {
                var l = Math.ceil(Math.random() * 100);
                array = [];
                for (var i = 0; i < l; i++) {
                    array.push(Math.random());
                }
                list = List.fromArray(array);
            });

            it('should do nothing if no parameter are passed', function () {
                list.unshift();
                expect(list).to.be.eql(array);
                expect(list.length).to.be(array.length);
            });

            it('should return the length', function () {
                expect(list.unshift()).to.be(list.length);
            });

            it('should add any object passed as parameter at the begining of the list', function () {
                var obj = {};
                list.unshift(1, obj);
                expect(list).to.be.eql([1, obj].concat(array));
            });

            it('should increase the length', function () {
                list.unshift(1, 2);
                expect(list.length).to.be(array.length + 2);
            });

        });

        describe('reduce method', function () {

            var list, callback;
            beforeEach(function () {
                list = List(1, 2, 3, 4);
                callback = sinon.spy(function (a, b) {
                    return a + b;
                });
            });

            it('should throw an error if a non function is passed as first parameter', function () {
                isCallableTest(List.prototype.reduce.bind(list));
            });

            it('should call the given callback x time, x being the list.length -1 if no second parameter is set', function () {
                list.reduce(callback);
                expect(callback.callCount).to.be(3);
            });


            it('should call the given callback x time, x being the list.length if a second parameter is set', function () {
                list.reduce(callback, undefined);
                expect(callback.callCount).to.be(4);
            });

            it('should call the given callback with arguments (previousValue,currentValue,index,array) ', function () {
                list.reduce(callback);
                expect(callback.args).to.be.eql([
                    [1, 2, 1, list],
                    [3, 3, 2, list],
                    [6, 4, 3, list]
                ]);
            });


            it('should call the given callback with arguments (previousValue,currentValue,index,array) previousValue being initial value if given', function () {
                list.reduce(callback, 0);
                expect(callback.args).to.be.eql([
                    [0, 1, 0, list],
                    [1, 2, 1, list],
                    [3, 3, 2, list],
                    [6, 4, 3, list]
                ]);
            });

            it('should return the  returned value of the last invocation of the callback ', function () {
                expect(list.reduce(callback, 0)).to.be(10);
                expect(callback.returnValues[callback.returnValues.length - 1]).to.be(10);
            });
        });


        describe('reduceRight method', function () {

            var list, callback;
            beforeEach(function () {
                list = List(1, 2, 3, 4);
                callback = sinon.spy(function (a, b) {
                    return a - b;
                });
            });

            it('should throw an error if a non function is passed as first parameter', function () {
                isCallableTest(List.prototype.reduceRight.bind(list));
            });

            it('should call the given callback x time, x being the list.length -1 if no second parameter is set', function () {
                list.reduceRight(callback);
                expect(callback.callCount).to.be(3);
            });


            it('should call the given callback x time, x being the list.length if a second parameter is set', function () {
                list.reduceRight(callback, undefined);
                expect(callback.callCount).to.be(4);
            });

            it('should call the given callback with arguments (previousValue,currentValue,index,array) ', function () {
                list.reduceRight(callback);
                expect(callback.args).to.be.eql([
                    [4, 3, 2, list],
                    [1, 2, 1, list],
                    [-1, 1, 0, list]
                ]);
            });

            it('should call the given callback with arguments (previousValue,currentValue,index,array) previousValue being initial value if given', function () {
                list.reduceRight(callback, 0);
                expect(callback.args).to.be.eql([
                    [0, 4, 3, list],
                    [-4, 3, 2, list],
                    [-7, 2, 1, list],
                    [-9, 1, 0, list]
                ]);
            });

            it('should return the  returned value of the last invocation of the callback ', function () {
                expect(list.reduceRight(callback, 0)).to.be(-10);
                expect(callback.returnValues[callback.returnValues.length - 1]).to.be(-10);
            });
        });


        describe('indexOf method', function () {
            var obj = {},
                list = List(1, {}, obj, obj, 4);

            it('should return the first index corresponding to the value given as parameter', function () {
                expect(list.indexOf(obj)).to.be(2);
            });


            it('should return -1 if the value cannot be found in the array', function () {
                expect(list.indexOf({})).to.be(-1);
            });
        });

        describe('lastIndexOf method', function () {
            var obj = {},
                list = List(1, {}, obj, obj, 4);

            it('should return the first index corresponding to the value given as parameter', function () {
                expect(list.lastIndexOf(obj)).to.be(3);
            });


            it('should return -1 if the value cannot be found in the array', function () {
                expect(list.lastIndexOf({})).to.be(-1);
            });
        });


        describe('every method', function () {
            var list, callback, returnValue;
            beforeEach(function () {
                list = List(1, 2, 3, 4);
                callback = sinon.spy(function () {
                    return returnValue;
                });
            });

            it('should throw an error if a non function is passed as first parameter', function () {
                isCallableTest(List.prototype.every.bind(list));
            });

            it('should call the callback on each element until the callback return false', function () {
                list.every(function (item) {
                    returnValue = (item !== 3);
                    return callback();
                });
                expect(callback.callCount).to.be(3);
            });


            it('should return true if every invocations of the callback returned true', function () {
                returnValue = true;
                expect(list.every(callback)).to.be(true);
            });


            it('should return false if one invocations of the callback returned true', function () {
                expect(list.every(function (item) {
                    return (item !== 3);
                })).to.be(false);
            });


            it('should call the callback with a "thisValue" equals to the given second parameter', function () {
                var obj = {};
                returnValue = true;
                list.every(callback, obj);
                expect(callback.alwaysCalledOn(obj)).to.be(true);
            });
        });

        describe('filter method', function () {
            var list, callback;
            beforeEach(function () {
                list = List(1, 2, 3, 4);
                callback = sinon.spy();
            });

            it('should throw an error if a non function is passed as first parameter', function () {
                isCallableTest(List.prototype.filter.bind(list));
            });

            it('should return a new instance of  List', function () {
                var newList = list.filter(function () {
                    return true;
                });
                expect(newList).to.be.a(List);
                expect(newList).to.not.be(list);
            });

            it('should call the callback on each element', function () {
                list.filter(callback);
                expect(callback.callCount).to.be(4);
            });


            it('should return a list composed of each element for which the callback invocation returned true', function () {
                expect(list.filter(function (a) {
                    return a % 2 === 0;
                })).to.be.eql([2, 4]);
            });


            it('should call the callback with arguments (value,index,list) ', function () {
                var obj = {};
                list.filter(callback, obj);
                expect(callback.args).to.be.eql([
                    [1, 0, list],
                    [2, 1, list],
                    [3, 2, list],
                    [4, 3, list]
                ]);
            });

            it('should call the callback with a "thisValue" equals to the given second parameter', function () {
                var obj = {};
                list.filter(callback, obj);
                expect(callback.alwaysCalledOn(obj)).to.be(true);
            });
        });


        describe('forEach method', function () {
            var list, callback;
            beforeEach(function () {
                list = List(1, 2, 3, 4);
                callback = sinon.spy();
            });

            it('should throw an error if a non function is passed as first parameter', function () {
                isCallableTest(List.prototype.forEach.bind(list));
            });


            it('should call the callback on each element', function () {
                list.forEach(callback);
                expect(callback.callCount).to.be(4);
            });


            it('should call the callback with arguments (value,index,list) ', function () {
                var obj = {};
                list.forEach(callback, obj);
                expect(callback.args).to.be.eql([
                    [1, 0, list],
                    [2, 1, list],
                    [3, 2, list],
                    [4, 3, list]
                ]);
            });

            it('should call the callback with a "thisValue" equals to the given second parameter', function () {
                var obj = {};
                list.forEach(callback, obj);
                expect(callback.alwaysCalledOn(obj)).to.be(true);
            });
        });


        describe('map method', function () {
            var list, callback;
            beforeEach(function () {
                list = List(1, 2, 3, 4);
                callback = sinon.spy(function (item) {
                    return item + 1;
                });
            });

            it('should throw an error if a non function is passed as first parameter', function () {
                isCallableTest(List.prototype.map.bind(list));
            });

            it('should return a new instance of List', function () {
                var newList = list.map(function () {
                    return true;
                });
                expect(newList).to.be.a(List);
                expect(newList).to.not.be(list);
            });

            it('should call the callback on each element', function () {
                list.map(callback);
                expect(callback.callCount).to.be(4);
            });


            it('should return a list composed of each return invocation of the callback', function () {
                expect(list.map(callback)).to.be.eql([2, 3, 4, 5]);
            });


            it('should call the callback with arguments (value,index,list) ', function () {
                var obj = {};
                list.map(callback, obj);
                expect(callback.args).to.be.eql([
                    [1, 0, list],
                    [2, 1, list],
                    [3, 2, list],
                    [4, 3, list]
                ]);
            });

            it('should call the callback with a "thisValue" equals to the given second parameter', function () {
                var obj = {};
                list.map(callback, obj);
                expect(callback.alwaysCalledOn(obj)).to.be(true);
            });
        });

        describe('some method', function () {
            var list, callback, returnValue;
            beforeEach(function () {
                list = List(1, 2, 3, 4);
                callback = sinon.spy(function () {
                    return returnValue;
                });
            });

            it('should throw an error if a non function is passed as first parameter', function () {
                isCallableTest(List.prototype.some.bind(list));
            });

            it('should call the callback on each element until the callback return true', function () {
                list.some(function (item) {
                    returnValue = (item === 3);
                    return callback();
                });
                expect(callback.callCount).to.be(3);
            });


            it('should return true if one invocations of the callback returned true', function () {
                expect(list.some(function (item) {
                    return (item === 3);
                })).to.be(true);
            });


            it('should return false if all invocations of the callback returned false', function () {
                returnValue = false;
                expect(list.some(callback)).to.be(false);
            });


            it('should call the callback with a "thisValue" equals to the given second parameter', function () {
                var obj = {};
                returnValue = false;
                list.some(callback, obj);
                expect(callback.alwaysCalledOn(obj)).to.be(true);
            });
        });
    });


    describe('observable behaviours', function () {


        var list, objectObserverChanges, arrayObserverChanges,
            observerCallbackCallCount, expectedCallBackCount, observerCallback;

        function notifyObservation() {
            observerCallbackCallCount++;
            if (observerCallback && observerCallbackCallCount === expectedCallBackCount) {
                observerCallback(objectObserverChanges, arrayObserverChanges);
            }
        }

        function objectObserver(changes) {
            objectObserverChanges.push(changes);
            notifyObservation();
        }

        function arrayObserver(changes) {
            arrayObserverChanges.push(changes);
            notifyObservation();
        }

        function getObservationResult(expectedCallBackCountParam, callback, doneCallback) {
            var observationDoneCallBack = function ()  {
                try {
                    callback.apply(null, arguments);
                } catch (e) {
                    doneCallback(e);
                }
                doneCallback();
            };
            if (expectedCallBackCountParam === 0) {
                setTimeout(function () {
                    observationDoneCallBack(observerCallbackCallCount);
                }, 10);
            }
            expectedCallBackCount = expectedCallBackCountParam;
            observerCallback = observationDoneCallBack;
        }

        beforeEach(function () {
            objectObserverChanges = [];
            arrayObserverChanges = [];
            observerCallbackCallCount = 0;
            list = List(1, 2, 3, 4);
            Object.observe(list, objectObserver);
            List.observe(list, arrayObserver);

        });

        afterEach(function () {
            Object.unobserve(list, objectObserver);
            List.unobserve(list, arrayObserver);
        });

        this.timeout(100);



        describe('length modification', function () {

            it('should notify length modification when length is increased, and a \'splice\' record', function (done) {
                list.length = 7;
                getObservationResult(2, function (objectObserverChanges, arrayObserverChanges) {
                    expect(objectObserverChanges).to.be.eql([[
                        {type: 'update', name: 'length', oldValue: 4, object: list}
                    ]]);
                    expect(arrayObserverChanges).to.be.eql([[
                        {type: 'splice', index: 4, addedCount: 3, removed: [], object: list}
                    ]]);
                }, done);
            });


            it('should notify deleted properties when length is decreased, and a \'splice\' change describing removed items', function (done) {
                list.length = 2;
                getObservationResult(2, function (objectObserverChanges, arrayObserverChanges) {
                    expect(objectObserverChanges).to.be.eql([[
                        {type: 'delete', name: '2', oldValue: 3, object: list},
                        {type: 'delete', name: '3', oldValue: 4, object: list},
                        {type: 'update', name: 'length', oldValue: 4, object: list}
                    ]]);
                    expect(arrayObserverChanges).to.be.eql([[
                        {type: 'splice', index: 2, addedCount: 0, removed: [3, 4], object: list}
                    ]]);
                }, done);
            });
        });

        describe('set method', function () {
            it('should  notify an change record of type \'update\' when the given index is already defined on the list ', function (done) {
                list.set(3, 5);
                getObservationResult(2, function (objectObserverChanges, arrayObserverChanges) {
                    expect(objectObserverChanges).to.be.eql([[
                        {type: 'update', name: '3', oldValue: 4, object: list}
                    ]]);
                    expect(arrayObserverChanges).to.be.eql([[
                        {type: 'update', name: '3', oldValue: 4, object: list}
                    ]]);
                }, done);
            });


            it('should notify a change record of type \'add\' when the given index is not in the list bound, and a length \'update\' record', function (done) {
                list.set(9, 5);
                getObservationResult(2, function (objectObserverChanges, arrayObserverChanges) {
                    expect(objectObserverChanges).to.be.eql([[
                        {type: 'add', name: '9', object: list},
                        {type: 'update', name: 'length', oldValue: 4, object: list}
                    ]]);
                    expect(arrayObserverChanges).to.be.eql([[
                        {type: 'splice', index: 4, addedCount: 6, removed: [], object: list}
                    ]]);
                }, done);
            });
        });

        describe('delete method', function () {

            it('should not notify anything if the index given is out of bounds', function (done) {
                getObservationResult(0, function (count) {
                    expect(count).to.be(0);
                }, done);
            });


            it('should notify a delete record if the index is in bounds', function (done) {
                list.delete(1);
                getObservationResult(2, function (objectObserverChanges, arrayObserverChanges) {
                    expect(objectObserverChanges).to.be.eql([[
                        {type: 'delete', name: '1', oldValue: 2, object: list}
                    ]]);
                    expect(arrayObserverChanges).to.be.eql([[
                        {type: 'delete', name: '1', oldValue: 2, object: list}
                    ]]);
                }, done);
            });


        });

        describe('pop method', function () {
            it('should notify a delete change record for the last index of the list, a length update record, and a splice change record', function (done) {
                list.pop();
                getObservationResult(2, function (objectObserverChanges, arrayObserverChanges) {
                    expect(objectObserverChanges).to.be.eql([[
                        {type: 'delete', name: '3', oldValue: 4, object: list},
                        {type: 'update', name: 'length', oldValue: 4, object: list}
                    ]]);
                    expect(arrayObserverChanges).to.be.eql([[
                        {type: 'splice', index: 3, addedCount: 0, removed: [4], object: list}
                    ]]);
                }, done);
            });
        });


        describe('push method', function () {

            it('should not notify anything if no parameters are given', function (done) {
                getObservationResult(0, function (count) {
                    expect(count).to.be(0);
                }, done);
            });

            it('should notify a \'add\' change record for all added item, a length \'update\' record and a \'splice\' change record', function (done) {
                list.push(5, 6);
                getObservationResult(2, function (objectObserverChanges, arrayObserverChanges) {
                    expect(objectObserverChanges).to.be.eql([[
                        {type: 'add', name: '4', object: list},
                        {type: 'add', name: '5', object: list},
                        {type: 'update', name: 'length', oldValue: 4, object: list}
                    ]]);
                    expect(arrayObserverChanges).to.be.eql([[
                        {type: 'splice', index: 4, addedCount: 2, removed: [], object: list}
                    ]]);
                }, done);
            });
        });

        describe('reverse method', function () {

            it('should notify an \'update\' record for all modified index', function (done) {
                list.reverse();
                getObservationResult(2, function (objectObserverChanges, arrayObserverChanges) {
                    expect(objectObserverChanges).to.be.eql([[
                        {type: 'update', name: '0', oldValue: 1, object: list},
                        {type: 'update', name: '1', oldValue: 2, object: list},
                        {type: 'update', name: '2', oldValue: 3, object: list},
                        {type: 'update', name: '3', oldValue: 4, object: list}
                    ]]);
                    expect(arrayObserverChanges).to.be.eql(objectObserverChanges);
                }, done);
            });

            it('should not notify anything for index that have not been modified', function (done) {
                list.push(5);
                list.reverse();
                getObservationResult(2, function (objectObserverChanges) {
                    expect(objectObserverChanges).to.be.eql([[
                        {type: 'add', name: '4', object: list},
                        {type: 'update', name: 'length', oldValue: 4, object: list},
                        {type: 'update', name: '0', oldValue: 1, object: list},
                        {type: 'update', name: '1', oldValue: 2, object: list},
                        {type: 'update', name: '3', oldValue: 4, object: list},
                        {type: 'update', name: '4', oldValue: 5, object: list}
                    ]]);
                }, done);
            });
        });


        describe('shift method', function () {
            it('should notify an \'update\' record for all index except the last one, a \'delete\' change record for the last index, a \'length\' update record and a \'splice\' change record', function (done) {
                list.shift();
                getObservationResult(2, function (objectObserverChanges, arrayObserverChanges) {
                    expect(objectObserverChanges).to.be.eql([[
                        {type: 'update', name: '0', oldValue: 1, object: list},
                        {type: 'update', name: '1', oldValue: 2, object: list},
                        {type: 'update', name: '2', oldValue: 3, object: list},
                        {type: 'delete', name: '3', oldValue: 4, object: list},
                        {type: 'update', name: 'length', oldValue: 4, object: list}
                    ]]);
                    expect(arrayObserverChanges).to.be.eql([[
                        {type: 'splice', index: 0, addedCount: 0, removed: [1], object: list}
                    ]]);
                }, done);
            });
        });


        describe('sort method', function () {

            it('should notify an update record for all modified index', function (done) {
                list.sort(function (a, b) {
                    return b - a;
                });
                getObservationResult(2, function (objectObserverChanges, arrayObserverChanges) {
                    expect(objectObserverChanges).to.be.eql([[
                        {type: 'update', name: '0', oldValue: 1, object: list},
                        {type: 'update', name: '1', oldValue: 2, object: list},
                        {type: 'update', name: '2', oldValue: 3, object: list},
                        {type: 'update', name: '3', oldValue: 4, object: list}
                    ]]);
                    expect(arrayObserverChanges).to.be.eql(objectObserverChanges);
                }, done);
            });

            it('should not notify anything for index that have not been modified', function (done) {
                getObservationResult(0, function (count) {
                    expect(count).to.be(0);
                }, done);
            });
        });


        describe('splice method', function () {
            it('should not notify anything if no parameters are given', function (done) {
                list.splice();
                getObservationResult(0, function (count) {
                    expect(count).to.be(0);
                }, done);
            });

            it('should notify \'update\' records, \'delete\' records  length \'update\' records and \'splice\' records if the operation decrease the list size', function (done) {
                list.splice(1, 2);
                getObservationResult(2, function (objectObserverChanges, arrayObserverChanges) {
                    expect(objectObserverChanges).to.be.eql([[
                        {type: 'update', name: '1', oldValue: 2, object: list},
                        {type: 'delete', name: '2', oldValue: 3, object: list},
                        {type: 'delete', name: '3', oldValue: 4, object: list},
                        {type: 'update', name: 'length', oldValue: 4, object: list}
                    ]]);
                    expect(arrayObserverChanges).to.be.eql([[
                        {type: 'splice', index: 1, addedCount: 0, removed: [2, 3], object: list}
                    ]]);
                }, done);
            });


            it('should notify \'update\' records, \'add\' records length \'update\' records and \'splice\' if the operation increase the list size', function (done) {
                list.splice(2, 0, 4, 5);

                getObservationResult(2, function (objectObserverChanges, arrayObserverChanges) {
                    expect(objectObserverChanges).to.be.eql([[
                        {type: 'update', name: '2', oldValue: 3, object: list},
                        {type: 'update', name: '3', oldValue: 4, object: list},
                        {type: 'add', name: '4', object: list},
                        {type: 'add', name: '5', object: list},
                        {type: 'update', name: 'length', oldValue: 4, object: list}
                    ]]);
                    expect(arrayObserverChanges).to.be.eql([[
                        {type: 'splice', index: 2, addedCount: 2, removed: [], object: list}
                    ]]);
                }, done);
            });


            it('should notify length \'update\' records only if the operation does not change the list size', function (done) {
                list.splice(2, 1, 4);
                getObservationResult(2, function (objectObserverChanges, arrayObserverChanges) {
                    expect(objectObserverChanges).to.be.eql([[
                        {type: 'update', name: '2', oldValue: 3, object: list}
                    ]]);
                    expect(arrayObserverChanges).to.be.eql([[
                        {type: 'splice', index: 2, addedCount: 1, removed: [3], object: list}
                    ]]);
                }, done);
            });


            it('should not notify any other records than \'splice\' if the operation does not modify the list', function (done) {
                list.splice(2, 1, 3);
                getObservationResult(1, function (objectObserverChanges, arrayObserverChanges) {
                    expect(objectObserverChanges).to.be.eql([]);
                    expect(arrayObserverChanges).to.be.eql([[
                        {type: 'splice', index: 2, addedCount: 1, removed: [3], object: list}
                    ]]);
                }, done);
            });
        });


        describe('unshift method', function () {
            it('should not notify anything if no parameters are given', function (done) {
                list.unshift();
                getObservationResult(0, function (count) {
                    expect(count).to.be(0);
                }, done);
            });

            it('should notify and \'update\' record for all index, a \'new\' change record for all added index, a length \'update\' record and a \'splice\' record', function (done) {
                list.unshift(5, 6);
                getObservationResult(2, function (objectObserverChanges, arrayObserverChanges) {
                    expect(objectObserverChanges).to.be.eql([[
                        {type: 'update', name: '0', oldValue: 1, object: list},
                        {type: 'update', name: '1', oldValue: 2, object: list},
                        {type: 'update', name: '2', oldValue: 3, object: list},
                        {type: 'update', name: '3', oldValue: 4, object: list},
                        {type: 'add', name: '4', object: list},
                        {type: 'add', name: '5', object: list},
                        {type: 'update', name: 'length', oldValue: 4, object: list}
                    ]]);
                    expect(arrayObserverChanges).to.be.eql([[
                        {type: 'splice', index: 0, addedCount: 2, removed: [], object: list}
                    ]]);
                }, done);
            });
        });
    });

});