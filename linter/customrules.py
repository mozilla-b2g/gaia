from closure_linter import errors
from closure_linter import errorrules

OriginalShouldReportError = None

def InjectErrorReporter():
 global OriginalShouldReportError
 OriginalShouldReportError = errorrules.ShouldReportError
 errorrules.ShouldReportError = MyShouldReportError

def MyShouldReportError(error):
 global OriginalShouldReportError
 return error not in (
   errors.LINE_TOO_LONG,
 ) and OriginalShouldReportError(error)

