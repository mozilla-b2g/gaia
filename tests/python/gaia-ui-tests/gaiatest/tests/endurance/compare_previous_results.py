#!/usr/bin/env python
#
# Compare endurance test results (avg b2g rss values) in the current run with
# results from the previous test suite run. Flag if the b2g rss memory use
# increases by x% in any of the tests; in future also compare with thresholds.
# To be run from Jenkins after the current results have been submitted to DataZilla.
# In the Jenkins workspace:
# ==> From current test run:  checkpoints/avg_b2g_rss_suite_summary.log
# ==> From previous test run: checkpoints/frompreviousbuild/checkpoints/avg_b2g_rss_suite_summary.log

import os
import sys


def parse_results(suite_summary_file):
    parsed_results = {}

    results_file = open(suite_summary_file, 'r')
    read_in = results_file.read().split("\n")
    results_file.close()

    for x in read_in:
        if x.find(':') != -1: # Ignore empty lines ie. last line of file which is empty
            k, v = x.split(': ')
            parsed_results[k] = v

    return parsed_results

def cli():
    current_results = {}
    previous_results = {}
    current_results_file_name = 'checkpoints/avg_b2g_rss_suite_summary.log'
    previous_results_file_name = 'checkpoints/frompreviousbuild/checkpoints/avg_b2g_rss_suite_summary.log'
    flagged_count = 0

    # Allowed deviation i.e. current value change from previous value, max allowed deviation before
    # the result is flagged as a failure; i.e. .1 (10%)
    allowed_deviation = .1

    # Get current and previous results
    current_results = parse_results(current_results_file_name)
    if len(current_results) == 0:
        print "No results found in avg_b2g_rss_suite_summary.log from current test run."
        exit(0)

    previous_results = parse_results(previous_results_file_name)
    if len(previous_results) == 0:
        print "No results found in avg_b2g_rss_suite_summary.log from previous test run."
        exit(0)

    # Compare; if want to flag return error code so jenkins will be marked as fail and send email
    for current_test, current_value in current_results.iteritems():
        try:
            current_value = int(current_value)
            previous_value = int(previous_results[current_test])
            print "\nTest: %s" % current_test
            print "Current test value: %d" % current_value
            print "Previous test value: %d" % previous_value
            difference = abs(current_value - previous_value)
            max_difference = previous_value * allowed_deviation
            print "Allowed deviation: %d (%d percent variation)" % (max_difference, allowed_deviation * 100)
            print "Difference: %d (%.2f percent)" % (difference, (float(difference) / previous_value) * 100.00)
            if difference > max_difference:
                print "Avg b2g rss value has changed more than the allowed deviation!"
                flagged_count += 1
            else:
                print "Avg b2g rss value change is within the allowable deviation."
            # TO-DO
            # Check current values against thresholds; since variation could occur over time that is under
            # the allowed deviation but over time exceeds it; and want to be sure to flag that also
        except:
            print "No previous results exist for '%s' test." % current_test
    
    print "\nNumber of tests with flagged results: %d" % flagged_count
    print "\nFinished.\n"

    if flagged_count:
        sys.exit(1)

if __name__ == '__main__':
    cli()
