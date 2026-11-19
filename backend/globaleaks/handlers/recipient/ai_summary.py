# Handler providing recipients with an AI summary of their caseload
import hashlib
import json
import os

from datetime import timedelta

from twisted.internet.defer import inlineCallbacks, returnValue
from twisted.internet.threads import deferToThread

import globaleaks.handlers.recipient as recipient_handlers

from globaleaks import models, LANGUAGES_SUPPORTED
from globaleaks.handlers.base import BaseHandler
from globaleaks.orm import db_log, transact
from globaleaks.rest import errors
from globaleaks.utils.ai_summary import AISummaryError, build_payload, request_summary
from globaleaks.utils.utility import datetime_now

CACHE_TTL = timedelta(minutes=15)

LANGUAGE_NAMES = {lang['code']: lang['name'] for lang in LANGUAGES_SUPPORTED}

# Summaries by (tid, user_id, language), reused while the summarised data is unchanged
summary_cache = {}


def localized(value, language):
    if not isinstance(value, dict):
        return value or ''

    return value.get(language) or value.get('en') or next(iter(value.values()), '')


@transact
def get_display_names(session, tid, language):
    """
    Transaction returning the channel and status names used in the summary

    :param session: An ORM session
    :param tid: A tenant ID
    :param language: The language of the names
    :return: A tuple of maps from id to name for channels, statuses and substatuses
    """
    channels = {c.id: localized(c.name, language)
                for c in session.query(models.Context).filter(models.Context.tid == tid)}

    statuses = {s.id: localized(s.label, language)
                for s in session.query(models.SubmissionStatus).filter(models.SubmissionStatus.tid == tid)}

    substatuses = {s.id: localized(s.label, language)
                   for s in session.query(models.SubmissionSubStatus).filter(models.SubmissionSubStatus.tid == tid)}

    return channels, statuses, substatuses


@transact
def log_ai_summary(session, tid, user_id, cases):
    db_log(session, tid=tid, type='ai_summary', user_id=user_id, data={'cases': cases})


class AISummaryHandler(BaseHandler):
    """
    Handler generating an AI summary of the reports assigned to the recipient
    """
    check_roles = 'receiver'

    @inlineCallbacks
    def get(self):
        tid = self.request.tid
        user_id = self.session.user_id
        language = self.request.language

        if not self.state.tenants[tid].cache.get('ai_summary_enabled', False):
            raise errors.ForbiddenOperation

        result = {'bullets': [], 'cases': 0, 'generated_at': None, 'error': None}

        # The provider is reached directly, so never when the platform is
        # configured to route every outgoing connection through Tor
        if self.state.tenants[1].cache.get('anonymize_outgoing_connections', False):
            result['error'] = 'anonymized_network'
            returnValue(result)

        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if not api_key:
            result['error'] = 'not_configured'
            returnValue(result)

        tips = yield recipient_handlers.get_receivertips(tid, user_id, self.session.cc, language)
        channels, statuses, substatuses = yield get_display_names(tid, language)

        now = datetime_now()
        payload, placeholders = build_payload(tips, channels, statuses, substatuses, now)
        result['cases'] = payload['totals']['cases']

        if not result['cases']:
            result['error'] = 'no_cases'
            returnValue(result)

        digest = hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()
        cache_key = (tid, user_id, language)
        cached = summary_cache.get(cache_key)
        if cached and cached['digest'] == digest and cached['expires'] > now:
            returnValue(cached['result'])

        try:
            result['bullets'] = yield deferToThread(request_summary,
                                                    payload,
                                                    placeholders,
                                                    LANGUAGE_NAMES.get(language, 'English'),
                                                    api_key)
        except AISummaryError as e:
            result['error'] = e.reason
            returnValue(result)

        result['generated_at'] = now

        yield log_ai_summary(tid, user_id, result['cases'])

        for key in [k for k, v in summary_cache.items() if v['expires'] <= now]:
            del summary_cache[key]

        summary_cache[cache_key] = {'digest': digest, 'expires': now + CACHE_TTL, 'result': result}

        returnValue(result)
