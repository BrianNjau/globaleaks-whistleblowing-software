# -*- coding: UTF-8 -*-

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


class MigrationScript(MigrationBase):
    def migrate_InternalTip(self):
        """
        Add new label columns to the internaltip table and migrate data.
        """
        for old_obj in self.session_old.query(self.model_from['InternalTip']):
            new_obj = self.model_to['InternalTip']()
            for key in new_obj.__mapper__.column_attrs.keys():
                setattr(new_obj, key, getattr(old_obj, key))

            # Initialize new label columns with default values
            new_obj.label1 = ''
            new_obj.label2 = ''
            new_obj.label3 = ''
            new_obj.label4 = ''
            new_obj.label5 = ''
            new_obj.label6 = ''

            self.session_new.add(new_obj)