from datetime import timedelta

from twisted.internet.defer import inlineCallbacks

from globaleaks import models
from globaleaks.handlers.recipient import ai_summary
from globaleaks.handlers.recipient.rtip import db_update_submission_status
from globaleaks.orm import transact
from globaleaks.rest import errors
from globaleaks.state import State
from globaleaks.tests import helpers
from globaleaks.utils.utility import datetime_now


class TestAISummary(helpers.TestHandlerWithPopulatedDB):
    _handler = ai_summary.AISummaryHandler

    # The archived test database predates the report label columns of this branch
    initialize_test_database_using_archived_db = False

    @inlineCallbacks
    def setUp(self):
        yield helpers.TestHandlerWithPopulatedDB.setUp(self)
        yield self.perform_full_submission_actions()
        State.tenants[1].cache.ai_summary_enabled = True

    def tearDown(self):
        State.tenants[1].cache.ai_summary_enabled = False
        return helpers.TestHandlerWithPopulatedDB.tearDown(self)

    def get(self, receiver):
        return self.request(user_id=receiver['id'], role='receiver').get()

    @transact
    def prepare_reports(self, session):
        """Report A: opened after 10 days, important, no update for 31 days.
           Report B: opened and closed 20 days after it was received."""
        now = datetime_now()
        itip_a, itip_b = session.query(models.InternalTip).order_by(models.InternalTip.progressive).all()
        user_id = self.dummyReceiver_1['id']

        itip_a.creation_date = now - timedelta(days=10)
        itip_a.update_date = now - timedelta(days=31)
        itip_a.important = True
        db_update_submission_status(session, 1, user_id, itip_a, 'opened')

        itip_b.creation_date = now - timedelta(days=20)
        db_update_submission_status(session, 1, user_id, itip_b, 'opened')
        db_update_submission_status(session, 1, user_id, itip_b, 'closed')

    @transact
    def remove_assignments(self, session, receiver_id):
        session.query(models.ReceiverTip).filter(models.ReceiverTip.receiver_id == receiver_id).delete()

    @inlineCallbacks
    def test_disabled(self):
        State.tenants[1].cache.ai_summary_enabled = False
        yield self.assertFailure(self.get(self.dummyReceiver_1), errors.ForbiddenOperation)

    @inlineCallbacks
    def test_new_reports(self):
        response = yield self.get(self.dummyReceiver_1)

        self.assertEqual(response['cases'], 2)
        self.assertEqual(response['error'], None)
        self.assertEqual(response['metrics'], {
            'avg_days_unopened': None,
            'avg_days_open': None,
            'oldest_open_days': None,
            'avg_days_to_close': None,
            'important': 0,
            'unread_updates': 2,
            'no_update_30_days': 0,
        })

    @inlineCallbacks
    def test_metrics(self):
        yield self.prepare_reports()

        response = yield self.get(self.dummyReceiver_1)

        self.assertEqual(response['metrics'], {
            'avg_days_unopened': 15,
            'avg_days_open': 0,
            'oldest_open_days': 0,
            'avg_days_to_close': 20,
            'important': 1,
            # Report A was last updated before the recipient's last access
            'unread_updates': 1,
            'no_update_30_days': 1,
        })

    @transact
    def rename_channel(self, session, name):
        for context in session.query(models.Context):
            context.name = {'en': name}

    @inlineCallbacks
    def test_conflict_of_interest_reports_are_excluded(self):
        yield self.rename_channel('Conflict of Interest')

        response = yield self.get(self.dummyReceiver_1)

        self.assertEqual(response, {'metrics': None, 'cases': 0, 'error': 'no_cases'})

    @inlineCallbacks
    def test_only_assigned_reports(self):
        yield self.remove_assignments(self.dummyReceiver_2['id'])

        response = yield self.get(self.dummyReceiver_2)

        self.assertEqual(response, {'metrics': None, 'cases': 0, 'error': 'no_cases'})
