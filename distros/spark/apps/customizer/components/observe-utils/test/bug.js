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

/*global describe, it, sinon, expect, beforeEach,  ObserveUtils */


describe('observer-utils bugs', function () {
    'use strict';

    var List = ObserveUtils.List;

    var list, notifySpy;
    beforeEach(function () {
        list = List(1, 2);
        var notifier = Object.getNotifier(list);
        notifySpy = notifier.notify = sinon.spy();
    });

    function getNotifiedChangesRecords() {
        return notifySpy.args.map(function (arr) {
            return arr[0];
        });
    }

    function getNotifiedChangesRecordsWithoutSplice() {
        return getNotifiedChangesRecords().filter(function (record) {
            return record.type !== 'splice';
        });
    }

    // issues #1 (https://github.com/KapIT/observe-utils/issues/1)
    it('Method like unshift create change records for index that does not have change', function () {
        list.unshift(1);
        expect(getNotifiedChangesRecordsWithoutSplice()).to.be.eql([
            {type: 'update', name: '1', oldValue: 2},
            {type: 'add', name: '2'},
            {type: 'update', name: 'length', oldValue: 2}
        ]);
    });

    it('Method like splice create change records for index that does not have change', function () {
        list.splice(0, 1, 1);
        expect(getNotifiedChangesRecordsWithoutSplice()).to.be.eql([]);
    });
});