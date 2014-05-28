# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import subprocess
from gaiatest import GaiaTestCase


class TestCrash(GaiaTestCase):
    @property
    def running_processes(self):
        ps = subprocess.Popen(['adb', 'shell', 'ps'], stdout=subprocess.PIPE)
        ps_out = ps.communicate()
        return ps_out[0].split('\n')

    @property
    def b2g_process_pid(self):
        b2g_pid = None
        for process in self.running_processes:
            if '/system/b2g/b2g' in process:
                b2g_pid = process.split()[1]
                break
        return b2g_pid

    def _kill_process_by_segmentation_fault_signal(self, pid):
        subprocess.call(['adb', 'shell', 'kill', '-11', pid])

    def tearDown(self):
        # Parent method is not called because Marionette socket is destroyed when b2g get killed causing the error:
        #   InvalidResponseException: Could not communicate with Marionette server. Is the Gecko process still running?
        pass

    def test_suite_recovers_after_a_crash(self):
        old_pid = self.b2g_process_pid
        self._kill_process_by_segmentation_fault_signal(old_pid)
        self.wait_for_condition(lambda m: self.b2g_process_pid is not None and self.b2g_process_pid != old_pid)
        self.assertNotEqual(self.b2g_process_pid, old_pid)
