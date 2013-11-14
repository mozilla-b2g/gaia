# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import cgi
import datetime
import json
import math
import os
import pkg_resources
import sys
import textwrap
import time
import base64

from py.xml import html
from py.xml import raw
from marionette import BaseMarionetteOptions, HTMLReportingOptionsMixin, HTMLReportingTestRunnerMixin, \
                       EnduranceOptionsMixin
from marionette import MarionetteTestResult
from marionette import MarionetteTextTestRunner
from marionette import BaseMarionetteTestRunner
from marionette.runtests import cli
from moztest.results import TestResult, relevant_line

from gaiatest import __name__
from gaiatest import GaiaTestCase, GaiaOptionsMixin, GaiaTestRunnerMixin
from version import __version__


class GaiaResult(TestResult):

    def __init__(self, *args, **kwargs):
        self.debug = kwargs.pop('debug', dict())
        TestResult.__init__(self, *args, **kwargs)

class GaiaTestResult(MarionetteTestResult):

    resultClass = GaiaResult

    def add_result(self, test, result_expected='PASS', debug=None,
                   result_actual='PASS', output='', context=None):
        def get_class(test):
            return test.__class__.__module__ + '.' + test.__class__.__name__

        t = self.resultClass(name=str(test).split()[0], test_class=get_class(test),
                             time_start=0, result_expected=result_expected,
                             context=context, debug=debug)
        t.finish(result_actual, time_end=0, reason=relevant_line(output),
                 output=output)
        self.append(t)

    def addError(self, test, err):
        self.add_result(test,
                        output=self._exc_info_to_string(err, test),
                        result_actual='ERROR',
                        debug=self.gather_debug())
        if self.showAll:
            self.stream.writeln("ERROR")
        elif self.dots:
            self.stream.write('E')
            self.stream.flush()

    def addExpectedFailure(self, test, err):
        self.add_result(test,
                        output=self._exc_info_to_string(err, test),
                        result_actual='KNOWN-FAIL',
                        debug=self.gather_debug())
        if self.showAll:
            self.stream.writeln("expected failure")
        elif self.dots:
            self.stream.write("x")
            self.stream.flush()

    def addFailure(self, test, err):
        self.add_result(test,
                        output=self._exc_info_to_string(err, test),
                        result_actual='UNEXPECTED-FAIL',
                        debug=self.gather_debug())
        if self.showAll:
            self.stream.writeln("FAIL")
        elif self.dots:
            self.stream.write('F')
            self.stream.flush()

    def addUnexpectedSuccess(self, test):
        self.add_result(test,
                        result_actual='UNEXPECTED-PASS')
        if self.showAll:
            self.stream.writeln("unexpected success")
        elif self.dots:
            self.stream.write("u")
            self.stream.flush()

    def gather_debug(self):
        debug = {}
        try:
            # TODO make screenshot consistant size by using full viewport
            # Bug 883294 - Add ability to take full viewport screenshots
            debug['screenshot'] = self.marionette.screenshot()
            debug['source'] = self.marionette.page_source
            self.marionette.switch_to_frame()
            debug['settings'] = json.dumps(self.marionette.execute_async_script("""
SpecialPowers.addPermission('settings-read', true, document);
var req = window.navigator.mozSettings.createLock().get('*');
req.onsuccess = function() {
  marionetteScriptFinished(req.result);
}""", special_powers=True), sort_keys=True, indent=4, separators=(',', ': '))
        except:
            pass
        return debug

class GaiaTestOptions(BaseMarionetteOptions, GaiaOptionsMixin, EnduranceOptionsMixin, HTMLReportingOptionsMixin):
    def __init__(self, **kwargs):
        BaseMarionetteOptions.__init__(self, **kwargs)
        GaiaOptionsMixin.__init__(self, **kwargs)
        HTMLReportingOptionsMixin.__init__(self, **kwargs)
        EnduranceOptionsMixin.__init__(self, **kwargs)


class GaiaTextTestRunner(MarionetteTextTestRunner):

    resultclass = GaiaTestResult


class GaiaTestRunner(BaseMarionetteTestRunner, GaiaTestRunnerMixin, HTMLReportingTestRunnerMixin):

    textrunnerclass = GaiaTextTestRunner

    def __init__(self, **kwargs):
        BaseMarionetteTestRunner.__init__(self, **kwargs)
        GaiaTestRunnerMixin.__init__(self, **kwargs)
        HTMLReportingTestRunnerMixin.__init__(self, name=__name__, version=__version__, **kwargs)
        self.test_handlers = [GaiaTestCase]

def main():
    cli(runner_class=GaiaTestRunner, parser_class=GaiaTestOptions)
