# Summary of a recipient's caseload
#
# Every figure is computed on the server from the reports assigned to the
# recipient; no data is sent to any external service.
import math

from datetime import timedelta

NO_UPDATE_DAYS = 30


def days(seconds):
    """Seconds as a whole number of days, rounding halves up the same way for every metric"""
    return math.floor(seconds / 86400 + 0.5)


def average_days(deltas):
    return days(sum(d.total_seconds() for d in deltas) / len(deltas)) if deltas else None


def compute_metrics(cases, now):
    """
    Compute the summary of a recipient's caseload

    :param cases: One dict per report assigned to the recipient, with the keys
                  creation_date, update_date, status, important, updated,
                  first_opened (when the report left the 'new' status, or None)
                  and closed (when the report was last closed, or None)
    :param now: The current UTC datetime
    :return: A dict of metrics; a duration is a whole number of days, or None when
             there is no report to compute it on
    """
    unopened_times = [c['first_opened'] - c['creation_date']
                      for c in cases if c['status'] != 'new' and c['first_opened']]

    open_ages = [now - c['first_opened']
                 for c in cases if c['status'] not in ('new', 'closed') and c['first_opened']]

    closing_times = [c['closed'] - c['creation_date']
                     for c in cases if c['status'] == 'closed' and c['closed']]

    no_update = [c for c in cases
                 if c['status'] != 'closed' and now - c['update_date'] > timedelta(days=NO_UPDATE_DAYS)]

    return {
        'avg_days_unopened': average_days(unopened_times),
        'avg_days_open': average_days(open_ages),
        'oldest_open_days': days(max(open_ages).total_seconds()) if open_ages else None,
        'avg_days_to_close': average_days(closing_times),
        'important': sum(1 for c in cases if c['important']),
        'unread_updates': sum(1 for c in cases if c['updated']),
        'no_update_30_days': len(no_update),
    }
