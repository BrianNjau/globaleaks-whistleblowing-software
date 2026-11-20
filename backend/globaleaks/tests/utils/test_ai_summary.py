import io
import json
import urllib.error

from datetime import datetime, timedelta
from unittest import mock

from twisted.trial import unittest

from globaleaks.utils import ai_summary
from globaleaks.utils.ai_summary import AISummaryError, build_payload, case_reference, compute_metrics, \
    redact, request_summary, restore_placeholders

NOW = datetime(2026, 11, 17, 12, 0)
NEVER = datetime(3000, 1, 1)
NULL = datetime(1970, 1, 1)

CHANNELS = {'ctx-wb': 'Whistleblowing', 'ctx-coi': 'Conflict of Interest'}
STATUSES = {'new': 'New', 'opened': 'Opened', 'closed': 'Closed'}
SUBSTATUSES = {'sub-1': 'Under investigation'}


def make_tip(**overrides):
    tip = {
        'id': 'a1b2c3d4-0000-0000-0000-000000000001',
        'creation_date': NOW - timedelta(days=10),
        'access_date': NOW,
        'last_access': NOW,
        'update_date': NOW - timedelta(days=2),
        'expiration_date': NEVER,
        'reminder_date': NULL,
        'progressive': 7,
        'yearly_sequence': 3,
        'important': False,
        'label': 'legacy label',
        'label1': 'Hotline',
        'label2': 'Nairobi',
        'label3': 'Fraud',
        'label4': 'Procurement',
        'label5': 'Female',
        'label6': 'Jane Wanjiru',
        'label7': 'No',
        'label8': '34',
        'updated': False,
        'context_id': 'ctx-wb',
        'tor': False,
        'answers': {'field-1': [{'value': 'My manager John Kamau took a bribe'}]},
        'score': 0,
        'status': 'opened',
        'substatus': 'sub-1',
        'file_count': 1,
        'comment_count': 4,
        'receiver_count': 2,
        'subscription': 1,
        'accessible': True,
    }
    tip.update(overrides)
    return tip


def build(tips):
    return build_payload(tips, CHANNELS, STATUSES, SUBSTATUSES, NOW)


class TestAISummaryPayload(unittest.TestCase):
    def test_inaccessible_reports_are_excluded(self):
        tips = [make_tip(), make_tip(id='other', yearly_sequence=9, accessible=False, label2='Mombasa')]
        payload, _ = build(tips)

        self.assertEqual(payload['totals']['cases'], 1)
        self.assertEqual([c['case'] for c in payload['cases']], ['3Y2026'])
        self.assertNotIn('Mombasa', json.dumps(payload))

    def test_sensitive_data_is_never_sent(self):
        payload, _ = build([make_tip(label3='Contact jane@example.org or +254 712 345 678')])
        serialized = json.dumps(payload, default=str)

        for value in ['a1b2c3d4', 'John Kamau', 'bribe', 'legacy label',
                      'Female', '"34"', 'Jane Wanjiru', 'jane@example.org', '712 345 678']:
            self.assertNotIn(value, serialized)

    def test_cases_only_contain_allowlisted_fields(self):
        payload, _ = build([make_tip()])
        allowed = {'case', 'channel', 'status', 'age_days', 'days_since_update', 'expires_in_days',
                   'important', 'unread_update', 'reminder_due', 'comments', 'files'}
        allowed |= {p['name'] for p in ai_summary.LABEL_POLICY.values() if p['mode'] != 'exclude'}

        self.assertTrue(set(payload['cases'][0]) <= allowed)

    def test_excluded_labels_are_absent_from_totals(self):
        payload, _ = build([make_tip()])

        self.assertNotIn('Gender', payload['totals']['by_label'])
        self.assertNotIn('Age', payload['totals']['by_label'])

    def test_investigator_is_pseudonymized_and_restored(self):
        tips = [make_tip(), make_tip(yearly_sequence=4, label6='Peter Otieno'), make_tip(yearly_sequence=5)]
        payload, placeholders = build(tips)

        self.assertEqual(placeholders, {'INV-1': 'Jane Wanjiru', 'INV-2': 'Peter Otieno'})
        self.assertEqual(payload['totals']['by_label']['Assigned Investigator'], {'INV-1': 2, 'INV-2': 1})
        self.assertEqual(restore_placeholders('INV-1 has 2 cases; INV-2 has 1. INV-10 unknown.', placeholders),
                         'Jane Wanjiru has 2 cases; Peter Otieno has 1. INV-10 unknown.')

    def test_attention_totals(self):
        tips = [
            make_tip(reminder_date=NOW - timedelta(days=1), important=True, updated=True),
            make_tip(expiration_date=NOW + timedelta(days=5), update_date=NOW - timedelta(days=40)),
            make_tip(status='closed', creation_date=NOW - timedelta(days=90)),
        ]
        totals = build(tips)[0]['totals']

        self.assertEqual(totals['open'], 2)
        self.assertEqual(totals['important'], 1)
        self.assertEqual(totals['unread_updates'], 1)
        self.assertEqual(totals['reminders_due'], 1)
        self.assertEqual(totals['expiring_within_14_days'], 1)
        self.assertEqual(totals['no_update_for_30_days'], 1)
        self.assertEqual(totals['received_last_30_days'], 2)
        self.assertEqual(totals['by_status'], {'Opened - Under investigation': 2, 'Closed - Under investigation': 1})

    def test_case_listing_is_capped(self):
        tips = [make_tip(yearly_sequence=i) for i in range(ai_summary.MAX_CASES_LISTED + 5)]
        payload, _ = build(tips)

        self.assertEqual(payload['totals']['cases'], ai_summary.MAX_CASES_LISTED + 5)
        self.assertEqual(len(payload['cases']), ai_summary.MAX_CASES_LISTED)
        self.assertEqual(payload['cases_listed'], ai_summary.MAX_CASES_LISTED)


class TestAISummaryMetrics(unittest.TestCase):
    def test_metrics(self):
        tips = [
            make_tip(id='open-1', creation_date=NOW - timedelta(days=10)),
            make_tip(id='open-2', status='new', creation_date=NOW - timedelta(days=30)),
            make_tip(id='closed-1', status='closed', creation_date=NOW - timedelta(days=50)),
            make_tip(id='closed-2', status='closed', creation_date=NOW - timedelta(days=40)),
            make_tip(id='closed-unknown', status='closed', creation_date=NOW - timedelta(days=400)),
            make_tip(id='not-assigned', creation_date=NOW - timedelta(days=900), accessible=False),
        ]
        closing_dates = {
            'closed-1': NOW - timedelta(days=30),  # closed after 20 days
            'closed-2': NOW - timedelta(days=10),  # closed after 30 days
            'not-assigned': NOW,
        }

        self.assertEqual(compute_metrics(tips, closing_dates, NOW),
                         {'avg_days_to_close': 25, 'avg_days_open': 20, 'oldest_open_days': 30})

    def test_average_never_exceeds_oldest(self):
        tips = [make_tip(creation_date=NOW - timedelta(days=2, hours=14)),
                make_tip(creation_date=NOW - timedelta(days=2, hours=13))]
        metrics = compute_metrics(tips, {}, NOW)

        self.assertEqual((metrics['avg_days_open'], metrics['oldest_open_days']), (3, 3))

    def test_metrics_without_closed_or_open_cases(self):
        self.assertEqual(compute_metrics([make_tip()], {}, NOW),
                         {'avg_days_to_close': None, 'avg_days_open': 10, 'oldest_open_days': 10})

        closed = [make_tip(id='c', status='closed', creation_date=NOW - timedelta(days=5))]
        self.assertEqual(compute_metrics(closed, {'c': NOW}, NOW),
                         {'avg_days_to_close': 5, 'avg_days_open': None, 'oldest_open_days': None})


def api_reply(bullets, stop_reason='end_turn'):
    content = [{'type': 'thinking', 'thinking': '...', 'signature': 'x'},
               {'type': 'text', 'text': json.dumps({'bullets': bullets})}]
    return io.BytesIO(json.dumps({'content': content, 'stop_reason': stop_reason}).encode())


def http_error(code):
    return urllib.error.HTTPError(ai_summary.API_URL, code, 'error', {}, io.BytesIO(b'{}'))


class TestAISummaryProxy(unittest.TestCase):
    def proxies(self, environ):
        with mock.patch.dict('os.environ', environ, clear=True), \
             mock.patch('globaleaks.utils.ai_summary.urllib.request.build_opener') as build_opener:
            ai_summary.open_url(mock.Mock(), None)

        handler = next(h for h in build_opener.call_args[0] if isinstance(h, ai_summary.urllib.request.ProxyHandler))
        return handler.proxies

    def test_unrelated_proxy_variables_are_ignored(self):
        self.assertEqual(self.proxies({'DEFAULT_PROXY': 'http://unreachable:8080',
                                       'http_proxy': 'http://unreachable:8080'}), {})

    def test_https_proxy_is_used(self):
        self.assertEqual(self.proxies({'https_proxy': 'http://proxy:3128'}), {'https': 'http://proxy:3128'})


@mock.patch('globaleaks.utils.ai_summary.time.sleep')
@mock.patch('globaleaks.utils.ai_summary.open_url')
class TestAISummaryRequest(unittest.TestCase):
    def summarize(self, max_bullets=4):
        return request_summary({'totals': {}}, {'INV-1': 'Jane Wanjiru'}, 'English', 'test-key', max_bullets)

    def test_request_and_response(self, urlopen, sleep):
        urlopen.return_value = api_reply([' INV-1 has 2 cases ', '', 'b', 'c', 'd', 'e'])

        self.assertEqual(self.summarize(), ['Jane Wanjiru has 2 cases', 'b', 'c', 'd'])

        request = urlopen.call_args[0][0]
        body = json.loads(request.data)
        self.assertEqual(request.full_url, 'https://api.anthropic.com/v1/messages')
        self.assertEqual(request.get_header('X-api-key'), 'test-key')
        self.assertEqual(request.get_header('Anthropic-version'), ai_summary.API_VERSION)
        self.assertEqual(body['model'], 'claude-haiku-5-5')
        self.assertEqual(body['output_config']['effort'], 'low')
        self.assertEqual(body['output_config']['format']['type'], 'json_schema')
        self.assertTrue(body['messages'][0]['content'].startswith('Write at most 4 bullets, in English.'))
        self.assertNotIn('Jane Wanjiru', request.data.decode())
        for key in ['temperature', 'top_p', 'top_k']:
            self.assertNotIn(key, body)

    def test_retries_then_succeeds(self, urlopen, sleep):
        urlopen.side_effect = [http_error(529), urllib.error.URLError('down'), api_reply(['ok'])]

        self.assertEqual(self.summarize(), ['ok'])
        self.assertEqual(urlopen.call_count, 3)

    def test_client_errors_are_not_retried(self, urlopen, sleep):
        urlopen.side_effect = [http_error(401)]

        with self.assertRaises(AISummaryError) as e:
            self.summarize()

        self.assertEqual(e.exception.reason, 'provider_error')
        self.assertEqual(urlopen.call_count, 1)

    def test_gives_up_after_retries(self, urlopen, sleep):
        urlopen.side_effect = [http_error(500)] * (ai_summary.API_RETRIES + 1)

        with self.assertRaises(AISummaryError):
            self.summarize()

        self.assertEqual(urlopen.call_count, ai_summary.API_RETRIES + 1)

    def test_refusal_and_bad_output(self, urlopen, sleep):
        for reply, reason in [(api_reply([], 'refusal'), 'refused'),
                              (api_reply(['x'], 'max_tokens'), 'provider_error'),
                              (io.BytesIO(b'{"content": [{"type": "text", "text": "not json"}]}'), 'provider_error'),
                              (io.BytesIO(b'not json'), 'provider_error')]:
            urlopen.side_effect = None
            urlopen.return_value = reply

            with self.assertRaises(AISummaryError) as e:
                self.summarize()

            self.assertEqual(e.exception.reason, reason)


class TestAISummaryHelpers(unittest.TestCase):
    def test_redact(self):
        self.assertEqual(redact('  Call   0712 345 678  '), 'Call [redacted]')
        self.assertEqual(redact('mail a.b@example.co.ke'), 'mail [redacted]')
        self.assertEqual(redact('Building 2024-25'), 'Building 2024-25')
        self.assertEqual(len(redact('x' * 500)), ai_summary.MAX_LABEL_LENGTH)

    def test_case_reference(self):
        self.assertEqual(case_reference(make_tip(), 'Whistleblowing'), '3Y2026')
        self.assertEqual(case_reference(make_tip(), 'Conflict of Interest'), '3COI26')
        self.assertEqual(case_reference(make_tip(yearly_sequence=None), 'Whistleblowing'), '#7')
