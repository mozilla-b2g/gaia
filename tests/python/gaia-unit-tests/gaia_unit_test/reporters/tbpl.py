from base import Base


class TBPLLogger(Base):
    def __init__(self, *args, **kwargs):
        self.logger = kwargs['logger']
        del kwargs['logger']
        Base.__init__(self, *args, **kwargs)

    def on_pass(self, data, testname):
        self.logger.testPass("%s | %s" % (testname, data['fullTitle']))

    def on_fail(self, data, testname):
        msg = data['fullTitle']
        if 'err' in data:
            if 'message' in data['err']:
                msg += " | %s" % data['err']['message']
        self.logger.testFail("%s | %s" % (testname, msg))
        if 'err' in data and 'stack' in data['err']:
            self.logger.info('stack trace:\n%s' % '\n'.join('    %s' % x for x in data['err']['stack'].split('\n')))

    def on_suite(self, data, testname):
        self.logger.testStart("%s | %s" % (testname, data['title']))

    def on_suite_end(self, data, testname):
        self.logger.testEnd("%s | %s" % (testname, data['title']))

    def on_end(self, data, testname):
        self.logger.info('suite results (pass/fail): %d/%d' %
                         (self.passes, self.failures))
