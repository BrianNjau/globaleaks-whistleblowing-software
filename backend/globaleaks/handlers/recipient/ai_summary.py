# Handler providing recipients with a summary of their caseload
from twisted.internet.defer import inlineCallbacks, returnValue

from globaleaks import models
from globaleaks.handlers.base import BaseHandler
from globaleaks.orm import transact
from globaleaks.rest import errors
from globaleaks.utils.ai_summary import compute_metrics
from globaleaks.utils.utility import datetime_now


def is_set(date):
    """Whether a date is a real date and not GlobaLeaks' null (1970) marker"""
    return date is not None and date.year > 1970


def is_conflict_of_interest(name):
    """Same rule used to number Conflict of Interest reports at submission"""
    return any('conflict of interest' in v.lower() for v in (name or {}).values() if isinstance(v, str))


@transact
def get_cases(session, tid, receiver_id):
    """
    Transaction returning the dates and flags of the reports assigned to a recipient

    Reports have no column for when they were first opened or closed, so these
    are taken from the audit log of status changes: the 'new' status is never
    logged, so the first logged change is when the report was first opened.

    :param session: An ORM session
    :param tid: A tenant ID
    :param receiver_id: The recipient ID
    :return: A list of dicts as expected by compute_metrics; Conflict of
             Interest reports are left out
    """
    coi_context_ids = [c.id for c in session.query(models.Context).filter(models.Context.tid == tid)
                       if is_conflict_of_interest(c.name)]

    cases = {}
    for itip_id, creation_date, update_date, status, important, last_access in \
            session.query(models.InternalTip.id,
                          models.InternalTip.creation_date,
                          models.InternalTip.update_date,
                          models.InternalTip.status,
                          models.InternalTip.important,
                          models.ReceiverTip.last_access) \
                   .filter(models.InternalTip.tid == tid,
                           models.InternalTip.context_id.notin_(coi_context_ids),
                           models.ReceiverTip.internaltip_id == models.InternalTip.id,
                           models.ReceiverTip.receiver_id == receiver_id):
        cases[itip_id] = {
            'creation_date': creation_date,
            'update_date': update_date,
            'status': status,
            'important': important,
            # Same rule as the unread indicator of the reports list
            'updated': last_access < update_date,
            'first_opened': None,
            'closed': None,
        }

    itip_ids = list(cases)

    # Chunked to stay below the SQLite limit on query parameters
    for i in range(0, len(itip_ids), 500):
        chunk = itip_ids[i:i + 500]

        for object_id, date, data in session.query(models.AuditLog.object_id,
                                                   models.AuditLog.date,
                                                   models.AuditLog.data) \
                                            .filter(models.AuditLog.tid == tid,
                                                    models.AuditLog.type == 'update_report_status',
                                                    models.AuditLog.object_id.in_(chunk)) \
                                            .order_by(models.AuditLog.date):
            case = cases[object_id]
            if case['first_opened'] is None:
                case['first_opened'] = date

            if isinstance(data, dict) and data.get('status') == 'closed':
                case['closed'] = date

        # Reports opened before status changes were logged: the first access
        # of any recipient is when the report was first opened
        for itip_id, access_date in session.query(models.ReceiverTip.internaltip_id,
                                                  models.ReceiverTip.access_date) \
                                           .filter(models.ReceiverTip.internaltip_id.in_(chunk)):
            case = cases[itip_id]
            if case['status'] != 'new' and is_set(access_date) and \
                    (case['first_opened'] is None or access_date < case['first_opened']):
                case['first_opened'] = access_date

    return list(cases.values())


class AISummaryHandler(BaseHandler):
    """
    Handler returning the summary of the reports assigned to the recipient
    """
    check_roles = 'receiver'

    @inlineCallbacks
    def get(self):
        tid = self.request.tid

        if not self.state.tenants[tid].cache.get('ai_summary_enabled', False):
            raise errors.ForbiddenOperation

        cases = yield get_cases(tid, self.session.user_id)

        if not cases:
            returnValue({'metrics': None, 'cases': 0, 'error': 'no_cases'})

        returnValue({'metrics': compute_metrics(cases, datetime_now()), 'cases': len(cases), 'error': None})
