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
from marionette import MarionetteTestOptions
from marionette import MarionetteTestResult
from marionette import MarionetteTestRunner
from marionette import MarionetteTextTestRunner
from marionette.runtests import cli
from moztest.results import TestResult, relevant_line
from yoctopuce.yocto_api import YAPI, YRefParam
from yoctopuce.yocto_current import YCurrent
from yoctopuce.yocto_datalogger import YDataLogger

from gaiatest import __name__
from gaiatest import GaiaTestCase
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


class GaiaTestOptions(MarionetteTestOptions):

    def __init__(self, **kwargs):
        MarionetteTestOptions.__init__(self, **kwargs)
        group = self.add_option_group('gaiatest')
        group.add_option('--restart',
                         action='store_true',
                         dest='restart',
                         default=False,
                         help='restart target instance between tests')
        group.add_option('--yocto',
                         action='store_true',
                         dest='yocto',
                         default=False,
                         help='collect voltage and amperage during test runs (requires special hardware)')
        group.add_option('--html-output',
                         action='store',
                         dest='html_output',
                         help='html output',
                         metavar='path')
        group.add_option('--iterations',
                         action='store',
                         dest='iterations',
                         type='int',
                         metavar='int',
                         help='iterations for endurance tests')
        group.add_option('--checkpoint',
                         action='store',
                         dest='checkpoint_interval',
                         type='int',
                         metavar='int',
                         help='checkpoint interval for endurance tests')

    def parse_args(self, args=None, values=None):
        options, tests = MarionetteTestOptions.parse_args(self)

        if options.iterations is not None:
            if options.checkpoint_interval is None or options.checkpoint_interval > options.iterations:
                options.checkpoint_interval = options.iterations

        return options, tests

    def verify_usage(self, options, tests):
        MarionetteTestOptions.verify_usage(self,options, tests)

        #options, tests = self.parse_args()

        if options.iterations is not None and options.iterations < 1:
            raise ValueError('iterations must be a positive integer')
        if options.checkpoint_interval is not None and options.checkpoint_interval < 1:
            raise ValueError('checkpoint interval must be a positive integer')
        if options.checkpoint_interval and not options.iterations:
            raise ValueError('you must specify iterations when using checkpoint intervals')
        if options.yocto:
            # need to verify that the yocto ammeter is attached
            errmsg = YRefParam()
            if YAPI.RegisterHub("usb", errmsg) != YAPI.SUCCESS:
                raise RuntimeError('could not register yocto usb connection: %s' % str(errmsg))

            # rescan for yocto devices
            if YAPI.UpdateDeviceList(errmsg) != YAPI.SUCCESS:
                raise RuntimeError('could not detect yoctopuce modules: %s' % str(errmsg))

            # check for ammeter
            ammeter = YCurrent.FirstCurrent()
            if ammeter is None:
                raise RuntimeError('could not find ammeter device')
            if ammeter.isOnline():
                module = ammeter.get_module()
                dc_ammeter = YCurrent.FindCurrent(module.get_serialNumber() + '.current1')
                if (not module.isOnline()) or (dc_ammeter is None):
                    raise RuntimeError('could not get ammeter device')
            else:
                raise RuntimeError('could not find yocto ammeter device')

            # check for data logger
            data_logger = YDataLogger.FirstDataLogger()
            if data_logger is None :
                raise RuntimeError('could not find data logger device')
            if data_logger.isOnline():
                module = data_logger.get_module()
                data_logger = YDataLogger.FindDataLogger(module.get_serialNumber() + '.dataLogger')
                if not module.isOnline() or data_logger is None:
                    raise RuntimeError('could not get data logger device')
            else:
                raise RuntimeError('could not find yocto ammeter device')

class GaiaTextTestRunner(MarionetteTextTestRunner):

    resultclass = GaiaTestResult


class GaiaTestRunner(MarionetteTestRunner):

    textrunnerclass = GaiaTextTestRunner

    def __init__(self, html_output=None, **kwargs):
        MarionetteTestRunner.__init__(self, **kwargs)

        width = 80
        if not (self.testvars.get('acknowledged_risks') is True or os.environ.get('GAIATEST_ACKNOWLEDGED_RISKS')):
            url = 'https://developer.mozilla.org/en-US/docs/Gaia_Test_Runner#Risks'
            heading = 'Acknowledge risks'
            message = 'These tests are destructive and will remove data from the target Firefox OS instance as well ' \
                      'as using services that may incur costs! Before you can run these tests you must follow the ' \
                      'steps to indicate you have acknowledged the risks detailed at the following address:'
            print '\n' + '*' * 5 + ' %s ' % heading.upper() + '*' * (width - len(heading) - 7)
            print '\n'.join(textwrap.wrap(message, width))
            print url
            print '*' * width + '\n'
            sys.exit(1)
        if not (self.testvars.get('skip_warning') is True or os.environ.get('GAIATEST_SKIP_WARNING')):
            delay = 30
            heading = 'Warning'
            message = 'You are about to run destructive tests against a Firefox OS instance. These tests ' \
                      'will restore the target to a clean state, meaning any personal data such as contacts, ' \
                      'messages, photos, videos, music, etc. will be removed. This will include data on the ' \
                      'microSD card. The tests may also attempt to initiate outgoing calls, or connect to ' \
                      'services such as cellular data, wifi, gps, bluetooth, etc.'
            try:
                print '\n' + '*' * 5 + ' %s ' % heading.upper() + '*' * (width - len(heading) - 7)
                print '\n'.join(textwrap.wrap(message, width))
                print '*' * width + '\n'
                print 'To abort the test run hit Ctrl+C on your keyboard.'
                print 'The test run will continue in %d seconds.' % delay
                time.sleep(delay)
            except KeyboardInterrupt:
                print '\nTest run aborted by user.'
                sys.exit(1)
            print 'Continuing with test run...\n'

        # for HTML output
        self.html_output = html_output
        self.testvars['html_output'] = self.html_output
        self.results = []

    def register_handlers(self):
        self.test_handlers.extend([GaiaTestCase])

    def run_tests(self, tests):
        MarionetteTestRunner.run_tests(self, tests)

        if self.html_output:
            # change default encoding to avoid encoding problem for page source
            reload(sys)
            sys.setdefaultencoding('utf-8')
            html_dir = os.path.dirname(os.path.abspath(self.html_output))
            if not os.path.exists(html_dir):
                os.makedirs(html_dir)
            with open(self.html_output, 'w') as f:
                f.write(self.generate_html(self.results))

    def generate_html(self, results_list):

        tests = sum([results.testsRun for results in results_list])
        failures = sum([len(results.failures) for results in results_list])
        expected_failures = sum([len(results.expectedFailures) for results in results_list])
        skips = sum([len(results.skipped) for results in results_list])
        errors = sum([len(results.errors) for results in results_list])
        passes = sum([results.passed for results in results_list])
        unexpected_passes = sum([len(results.unexpectedSuccesses) for results in results_list])
        test_time = self.elapsedtime.total_seconds()
        test_logs = []

        def _extract_html(test, class_name, duration=0, text='', result='passed', debug=None):
            cls_name = class_name
            tc_name = unicode(test)
            tc_time = duration
            additional_html = []
            debug = debug or {}
            links_html = []

            if result in ['skipped', 'failure', 'expected failure', 'error']:
                if debug.get('screenshot'):
                    screenshot = 'data:image/png;base64,%s' % debug['screenshot']
                    additional_html.append(html.div(
                        html.a(html.img(src=screenshot), href="#"),
                        class_='screenshot'))
                for name, content in debug.items():
                    try:
                        if 'screenshot' in name:
                            href = '#'
                        else:
                            # use base64 to avoid that some browser (such as Firefox, Opera)
                            # treats '#' as the start of another link if the data URL contains.
                            # use 'charset=utf-8' to show special characters like Chinese.
                            href = 'data:text/plain;charset=utf-8;base64,%s' % base64.b64encode(content)
                        links_html.append(html.a(
                            name.title(),
                            class_=name,
                            href=href,
                            target='_blank'))
                        links_html.append(' ')
                    except:
                        pass

                log = html.div(class_='log')
                for line in text.splitlines():
                    separator = line.startswith(' ' * 10)
                    if separator:
                        log.append(line[:80])
                    else:
                        if line.lower().find("error") != -1 or line.lower().find("exception") != -1:
                            log.append(html.span(raw(cgi.escape(line)), class_='error'))
                        else:
                            log.append(raw(cgi.escape(line)))
                    log.append(html.br())
                additional_html.append(log)

            test_logs.append(html.tr([
                html.td(result.title(), class_='col-result'),
                html.td(cls_name, class_='col-class'),
                html.td(tc_name, class_='col-name'),
                html.td(tc_time, class_='col-duration'),
                html.td(links_html, class_='col-links'),
                html.td(additional_html, class_='debug')],
                class_=result.lower() + ' results-table-row'))

        for results in results_list:
            for test in results.tests_passed:
                _extract_html(test.name, test.test_class)
            for result in results.skipped:
                _extract_html(result.name, result.test_class, text='\n'.join(result.output), result='skipped')
            for result in results.failures:
                _extract_html(result.name, result.test_class, text='\n'.join(result.output), result='failure', debug=result.debug)
            for result in results.expectedFailures:
                _extract_html(result.name, result.test_class, text='\n'.join(result.output), result='expected failure', debug=result.debug)
            for test in results.unexpectedSuccesses:
                _extract_html(test.name, test.test_class, result='unexpected pass')
            for result in results.errors:
                _extract_html(result.name, result.test_class, text='\n'.join(result.output), result='error', debug=result.debug)

        generated = datetime.datetime.now()
        doc = html.html(
            html.head(
                html.meta(charset='utf-8'),
                html.title('Test Report'),
                html.style(raw(pkg_resources.resource_string(
                    __name__, os.path.sep.join(['resources', 'report', 'style.css']))),
                    type='text/css')),
            html.body(
                html.script(raw(pkg_resources.resource_string(
                    __name__, os.path.sep.join(['resources', 'report', 'jquery.js']))),
                    type='text/javascript'),
                html.script(raw(pkg_resources.resource_string(
                    __name__, os.path.sep.join(['resources', 'report', 'main.js']))),
                    type='text/javascript'),
                html.p('Report generated on %s at %s by %s %s' % (
                    generated.strftime('%d-%b-%Y'),
                    generated.strftime('%H:%M:%S'),
                    __name__, __version__)),
                html.h2('Summary'),
                html.p('%i tests ran in %i seconds.' % (tests, test_time),
                       html.br(),
                       html.span('%i passed' % passes, class_='passed'), ', ',
                       html.span('%i skipped' % skips, class_='skipped'), ', ',
                       html.span('%i failed' % failures, class_='failed'), ', ',
                       html.span('%i errors' % errors, class_='error'), '.',
                       html.br(),
                       html.span('%i expected failures' % expected_failures,
                                 class_='expected failure'), ', ',
                       html.span('%i unexpected passes' % unexpected_passes,
                                 class_='unexpected pass'), '.'),
                html.h2('Results'),
                html.table([html.thead(
                    html.tr([
                        html.th('Result', class_='sortable', col='result'),
                        html.th('Class', class_='sortable', col='class'),
                        html.th('Test Name', class_='sortable', col='name'),
                        html.th('Duration', class_='sortable numeric', col='duration'),
                        html.th('Links')]), id='results-table-head'),
                    html.tbody(test_logs, id='results-table-body')], id='results-table')))
        return doc.unicode(indent=2)


def main():
    cli(runner_class=GaiaTestRunner, parser_class=GaiaTestOptions)
