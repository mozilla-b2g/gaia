""" Base class which reporters should all inherit from.
    The design is based on the original Mocha (javascript)
    reporter architecture.
"""


PASS_MARK = u"\u2713"
FAIL_MARK = u"\u2716"


class Base:

    def __init__(self, stream=True):
        # reporter output
        self.output = []
        self.stream_output = stream

        # test details
        self.passes = 0
        self.failures = 0
        self.pending = 0
        self.duration = 0

        self.failed_tests = []

        # analytics
        self.indent = 0
        self.tests = 0
        self.suites = 0

    def formatError(self, data):
        if not ('err' in data):
            return ''

        err = data['err']

        out = data['fullTitle']
        out += '\n  ' + err['message'] + '\n'

        def indent(item):
            return '    ' + item

        if ('stack' in err):
            out += '\n'.join(map(indent, err['stack'].split('\n')))

        return out

    def epilogue(self):
        self.report('\n')

        if self.failed_tests:
            for test in self.failed_tests:
                self.report(self.formatError(test))

        if self.failures:
            self.report(FAIL_MARK + ' %d of %d test(s) failed' % (self.failures, self.tests))
        else:
            self.report(PASS_MARK + ' %d test(s) complete' % (self.tests))

        self.report('took %d ms' % (self.duration))

    def on_end(self, data):
        self.epilogue()

    def report(self, string, indent=False):
        """ When self.stream_output is true will instantly
            print results otherwise the results are added
            to self.output.
        """
        if indent:
            string = ('  ' * self.indent) + string

        if self.stream_output:
            print string
        else:
            self.output.append(string)

    def handle_event(self, event, data, testname):
        """ handles test events. The base class
            is mostly responsible for incrementing the
            reusable logic that the children then use.
        """
        if event == 'pass':
            self.passes += 1

        if event == 'fail':
            self.failures += 1
            self.failed_tests.append(data)

        if event == 'pending':
            self.pending += 1

        if event == 'suite':
            self.indent += 1

        if event == 'suite end':
            self.indent -= 1

        if event == 'end':
            self.tests = data['tests']
            self.duration = data['duration']
            self.suites = data['suites']

        methodName = 'on_' + event.replace(' ', '_')

        if (hasattr(self, methodName)):
            getattr(self, methodName)(data, testname)
