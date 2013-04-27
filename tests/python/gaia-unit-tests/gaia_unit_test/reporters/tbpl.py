from base import Base


class TBPLLogger(Base):
    def __init__(self, *args, **kwargs):
        self.logger = kwargs['logger']
        del kwargs['logger']
        Base.__init__(self, *args, **kwargs)

    def on_pass(self, data):
        self.logger.testPass(data['fullTitle'])

    def on_fail(self, data):
        msg = data['fullTitle']
        if 'err' in data:
            if 'message' in data['err']:
                msg += " | %s" % data['err']['message']
        self.logger.testFail(msg)
        if 'err' in data and 'stack' in data['err']:
            self.logger.info('stack trace:\n%s' % '\n'.join('    %s' % x for x in data['err']['stack'].split('\n')))

    def on_suite(self, data):
        self.logger.testStart(data['title'])

    def on_suite_end(self, data):
        self.logger.testEnd(data['title'])

    def on_end(self, data):
        self.logger.info('suite results (pass/fail): %d/%d' %
                         (self.passes, self.failures))
