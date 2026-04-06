import React from 'react';
import Modal from './Modal';

export default function ConfirmModal({ title, message, onConfirm, onClose, loading }) {
  return (
    <Modal
      title={title || 'Confirm action'}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </>
      }
    >
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{message}</p>
    </Modal>
  );
}
