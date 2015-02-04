
Feature: Recursive feature

  Scenario: Reading and making recursively
    Given I make '/fake/foo/bar/char/delta'
    Given I make '/fake/foo/echo'
    When I check how many items in '/fake'
    Then I should see '5'

  Scenario: Removing recursively
    Given I make '/fake/foo/bar/char/delta'
    When I remove '/fake/foo'
    When I check how many items in '/fake'
    Then I should see '0'
