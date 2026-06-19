# -*- coding: UTF-8 -*-
from collections import defaultdict

from globaleaks.db.migrations.update import MigrationBase
from globaleaks.models import Model
from globaleaks.models.properties import *
from globaleaks.utils.utility import datetime_now, datetime_never


class InternalTip_v_68(Model):
    """
    Updated InternalTip model with new label columns.
    """
    __tablename__ = 'internaltip'
    id = Column(UnicodeText(36), primary_key=True, default=uuid4)
    tid = Column(Integer, default=1, nullable=False)
    creation_date = Column(DateTime, default=datetime_now, nullable=False)
    update_date = Column(DateTime, default=datetime_now, nullable=False)
    context_id = Column(UnicodeText(36), nullable=False)
    progressive = Column(Integer, default=0, nullable=False)
    tor = Column(Boolean, default=False, nullable=False)
    mobile = Column(Boolean, default=False, nullable=False)
    score = Column(Integer, default=0, nullable=False)
    expiration_date = Column(DateTime, default=datetime_never, nullable=False)
    reminder_date = Column(DateTime, default=datetime_never, nullable=False)
    enable_whistleblower_identity = Column(Boolean, default=False, nullable=False)
    important = Column(Boolean, default=False, nullable=False)
    label = Column(UnicodeText, default='', nullable=False)
    last_access = Column(DateTime, default=datetime_now, nullable=False)
    status = Column(UnicodeText(36))
    substatus = Column(UnicodeText(36))
    receipt_hash = Column(UnicodeText(44), nullable=False)
    crypto_prv_key = Column(UnicodeText(84), default='', nullable=False)
    crypto_pub_key = Column(UnicodeText(56), default='', nullable=False)
    crypto_tip_pub_key = Column(UnicodeText(56), default='', nullable=False)
    crypto_tip_prv_key = Column(UnicodeText(84), default='', nullable=False)
    deprecated_crypto_files_pub_key = Column(UnicodeText(56), default='', nullable=False)

    # New label columns
    label1 = Column(UnicodeText, default='', nullable=False)
    label2 = Column(UnicodeText, default='', nullable=False)
    label3 = Column(UnicodeText, default='', nullable=False)
    label4 = Column(UnicodeText, default='', nullable=False)
    label5 = Column(UnicodeText, default='', nullable=False)
    label6 = Column(UnicodeText, default='', nullable=False)
    label7 = Column(UnicodeText, default='', nullable=False)
    label8 = Column(UnicodeText, default='', nullable=False)


class MigrationScript(MigrationBase):
    def migrate_InternalTip(self):
        """
        Add new label columns and yearly_sequence to the internaltip table and migrate data.
        """
        # First pass: collect all tips grouped by (tid, context_id, year) and sort by progressive
        tips_by_group = defaultdict(list)
        old_tips = list(self.session_old.query(self.model_from['InternalTip']))

        for old_obj in old_tips:
            year = old_obj.creation_date.year
            group_key = (old_obj.tid, old_obj.context_id, year)
            tips_by_group[group_key].append(old_obj)

        # Sort each group by progressive to assign correct yearly_sequence
        for group_key in tips_by_group:
            tips_by_group[group_key].sort(key=lambda t: t.progressive)

        # Compute yearly_sequence for each tip
        yearly_seq_map = {}
        for group_key, tips in tips_by_group.items():
            for seq, tip in enumerate(tips, start=1):
                yearly_seq_map[tip.id] = seq

        # Second pass: create new objects with all fields populated
        for old_obj in old_tips:
            new_obj = self.model_to['InternalTip']()
            for key in new_obj.__mapper__.column_attrs.keys():
                if key in ('label1', 'label2', 'label3', 'label4',
                           'label5', 'label6', 'label7', 'label8'):
                    setattr(new_obj, key, '')
                elif key == 'yearly_sequence':
                    setattr(new_obj, key, yearly_seq_map.get(old_obj.id, 0))
                else:
                    setattr(new_obj, key, getattr(old_obj, key))

            self.session_new.add(new_obj)
