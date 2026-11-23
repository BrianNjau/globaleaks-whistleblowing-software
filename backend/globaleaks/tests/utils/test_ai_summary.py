from datetime import datetime, timedelta

from twisted.trial import unittest

from globaleaks.utils.ai_summary import compute_metrics

NOW = datetime(2026, 11, 17, 12, 0)


def ago(days, hours=0):
    return NOW - timedelta(days=days, hours=hours)


def make_case(**overrides):
    case = {
        'creation_date': ago(10),
        'update_date': ago(2),
        'status': 'opened',
        'important': False,
        'updated': False,
        'first_opened': ago(8),
        'closed': None,
    }
    case.update(overrides)
    return case


class TestCaseloadMetrics(unittest.TestCase):
    def test_metrics(self):
        cases = [
            # still new: counted in none of the durations
            make_case(status='new', creation_date=ago(3), first_opened=None, important=True, updated=True),
            # opened after 2 days, open for 8 days
            make_case(creation_date=ago(10), first_opened=ago(8)),
            # opened after 4 days, open for 16 days, custom status, no update for 31 days
            make_case(status='custom-status', creation_date=ago(20), first_opened=ago(16), update_date=ago(31)),
            # opened after 6 days, closed after 25 days, no update for 40 days but closed
            make_case(status='closed', creation_date=ago(40), first_opened=ago(34), closed=ago(15),
                      update_date=ago(40), important=True),
            # closed after 35 days
            make_case(status='closed', creation_date=ago(50), first_opened=ago(44), closed=ago(15), updated=True),
        ]

        self.assertEqual(compute_metrics(cases, NOW), {
            'avg_days_unopened': 5,  # (2 + 4 + 6 + 6) / 4 = 4.5, halves are rounded up
            'avg_days_open': 12,
            'oldest_open_days': 16,
            'avg_days_to_close': 30,
            'important': 2,
            'unread_updates': 2,
            'no_update_30_days': 1,
        })

    def test_durations_are_left_out_without_data(self):
        metrics = compute_metrics([make_case(status='new', first_opened=None)], NOW)

        self.assertEqual(metrics['avg_days_unopened'], None)
        self.assertEqual(metrics['avg_days_open'], None)
        self.assertEqual(metrics['oldest_open_days'], None)
        self.assertEqual(metrics['avg_days_to_close'], None)
        self.assertEqual(metrics['no_update_30_days'], 0)

    def test_cases_without_known_dates_are_skipped(self):
        cases = [make_case(first_opened=None), make_case(status='closed', closed=None)]
        metrics = compute_metrics(cases, NOW)

        self.assertEqual(metrics['avg_days_open'], None)
        self.assertEqual(metrics['avg_days_to_close'], None)
        self.assertEqual(metrics['avg_days_unopened'], 2)

    def test_exactly_30_days_without_update_is_not_counted(self):
        metrics = compute_metrics([make_case(update_date=ago(30)), make_case(update_date=ago(30, 1))], NOW)

        self.assertEqual(metrics['no_update_30_days'], 1)

    def test_average_never_exceeds_oldest(self):
        cases = [make_case(first_opened=ago(2, 14)), make_case(first_opened=ago(2, 13))]
        metrics = compute_metrics(cases, NOW)

        self.assertEqual((metrics['avg_days_open'], metrics['oldest_open_days']), (3, 3))
