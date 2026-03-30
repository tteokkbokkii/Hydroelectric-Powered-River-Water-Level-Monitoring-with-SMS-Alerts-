import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Dropdown } from 'primereact/dropdown';
import mqtt from 'mqtt';

const API_BASE = 'http://192.168.100.97:5000/api';
const MQTT_BROKER = 'ws://192.168.100.97:9001';

// ---------- Generic Popup Component (using Portal) ----------
const Popup = ({ message, severity, onClose, buttons = [{ label: 'OK', onClick: null }] }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleButtonClick = (btn) => {
    if (btn.onClick) btn.onClick();
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="notification-overlay" onClick={onClose}>
      <div className={`notification-card ${severity}`} onClick={(e) => e.stopPropagation()}>
        <button className="notification-close-x" onClick={onClose}>×</button>
        <div className="notification-header">
          <h3>{severity === 'error' ? '⚠️ ERROR' : severity === 'success' ? '✓ SUCCESS' : 'ℹ️ INFORMATION'}</h3>
        </div>
        <div className="notification-body">
          <p>{message}</p>
        </div>
        <div className="notification-footer">
          {buttons.map((btn, idx) => (
            <button
              key={idx}
              className={idx === 0 ? "notification-primary-btn" : "notification-secondary-btn"}
              onClick={() => handleButtonClick(btn)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

const ContactsTab = () => {
  // ---------- State ----------
  const [contacts, setContacts] = useState([]);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editForm, setEditForm] = useState({ name: '', phone: '+63', alertLevel: 'ALL' });
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [customMessage, setCustomMessage] = useState("Test ID: 001 Status: GSM Link Verification...");
  const [smsLogs, setSmsLogs] = useState([]);
  const [mqttClient, setMqttClient] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Popup state
  const [popup, setPopup] = useState({ visible: false, message: '', severity: '', buttons: [] });

  const showPopup = (message, severity, buttons = [{ label: 'OK', onClick: null }]) => {
    setPopup({ visible: true, message, severity, buttons });
  };

  const closePopup = () => {
    setPopup({ visible: false, message: '', severity: '', buttons: [] });
  };

  const alertLevelOptions = [
    { label: 'ALL', value: 'ALL' },
    { label: 'WARNING', value: 'WARNING' },
    { label: 'CRITICAL', value: 'CRITICAL' }
  ];

  // ---------- Fetch contacts from REST API ----------
  useEffect(() => {
    fetch(`${API_BASE}/contacts`)
      .then(res => res.json())
      .then(data => setContacts(data))
      .catch(err => console.error('Error fetching contacts:', err));
  }, []);

  // ---------- Fetch initial SMS logs ----------
  useEffect(() => {
    fetch(`${API_BASE}/sms-logs`)
      .then(res => res.json())
      .then(data => setSmsLogs(data))
      .catch(err => console.error('Error fetching SMS logs:', err));
  }, []);

  // ---------- MQTT connection for real-time updates ----------
  useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER);
    client.on('connect', () => {
      console.log('Contacts Tab connected to MQTT');
      client.subscribe('contacts/update');
      client.subscribe('sms/log');
      setMqttClient(client);
    });
    client.on('message', (topic, message) => {
      if (topic === 'contacts/update') {
        try {
          const updatedContacts = JSON.parse(message.toString());
          setContacts(updatedContacts);
          console.log('Contacts updated via MQTT');
        } catch (e) {
          console.error('Failed to parse contacts update:', message.toString());
        }
      } else if (topic === 'sms/log') {
        try {
          const log = JSON.parse(message.toString());
          const now = new Date();
          const timeStr = now.toLocaleTimeString('en-GB', { hour12: false }).slice(0,5);
          setSmsLogs(prev => [{
            time: timeStr,
            recipient: log.recipient,
            message: log.message,
            type: log.type,
            color: log.type === 'alert' ? 'alrt' : 'maint'
          }, ...prev].slice(0, 50));
        } catch (e) {
          console.error('Failed to parse SMS log:', message.toString());
        }
      }
    });
    return () => {
      if (client) client.end();
    };
  }, []);

  // ---------- Contact Handlers (CRUD with API) ----------
  const handleEdit = (index) => {
    if (isSaving) return;
    setEditingIndex(index);
    setEditForm({ ...contacts[index] });
  };

  const handleAdd = () => {
    if (isSaving) return;
    setEditForm({ name: '', phone: '+63', alertLevel: 'ALL' });
    setEditingIndex('new');
  };

  const handleSaveEdit = async () => {
    if (isSaving) return;
    if (!editForm.name.trim()) {
      showPopup('Please enter a name', 'error');
      return;
    }
    if (!editForm.phone.trim()) {
      showPopup('Please enter a phone number', 'error');
      return;
    }
    if (!/^\+63\d{10}$/.test(editForm.phone)) {
      showPopup('Phone number must be in format +63 followed by exactly 10 digits', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingIndex === 'new') {
        const response = await fetch(`${API_BASE}/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm)
        });
        if (!response.ok) throw new Error('Failed to add contact');
        showPopup('Contact added successfully!', 'success');
      } else {
        const contactId = contacts[editingIndex].id;
        const response = await fetch(`${API_BASE}/contacts/${contactId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm)
        });
        if (!response.ok) throw new Error('Failed to update contact');
        showPopup('Contact updated successfully!', 'success');
      }
      setEditingIndex(-1);
    } catch (err) {
      console.error(err);
      showPopup('Error saving contact. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isSaving) return;
    setEditingIndex(-1);
    setEditForm({ name: '', phone: '+63', alertLevel: 'ALL' });
  };

  const handleDelete = async (index) => {
    if (isSaving) return;
    const contactName = contacts[index].name;
    // Confirmation popup
    showPopup(`Delete contact "${contactName}"?`, 'info', [
      {
        label: 'YES',
        onClick: async () => {
          setTimeout(async () => {
            setIsSaving(true);
            try {
              const contactId = contacts[index].id;
              const response = await fetch(`${API_BASE}/contacts/${contactId}`, {
                method: 'DELETE'
              });
              if (!response.ok) throw new Error('Failed to delete contact');
              showPopup(`Contact "${contactName}" deleted.`, 'success');
            } catch (err) {
              console.error(err);
              showPopup('Error deleting contact. Please try again.', 'error');
            } finally {
              setIsSaving(false);
            }
          }, 50);
        }
      },
      {
        label: 'NO',
        onClick: () => {
          setTimeout(() => {
            showPopup('Contact deletion cancelled.', 'info');
          }, 50);
        }
      }
    ]);
  };

  // ---------- Manual SMS sending ----------
  const handleSend = () => {
    if (!selectedRecipient) {
      showPopup('Please select a recipient', 'error');
      return;
    }
    const contact = contacts.find(c => c.name === selectedRecipient);
    if (!contact) {
      showPopup('Contact not found', 'error');
      return;
    }
    if (!customMessage.trim()) {
      showPopup('Please enter a message', 'error');
      return;
    }

    // Confirmation popup
    showPopup(`Send message to "${contact.name}"?`, 'info', [
      {
        label: 'YES',
        onClick: () => {
          if (mqttClient && mqttClient.connected) {
            setTimeout(() => {
              const payload = JSON.stringify({
                phone: contact.phone,
                message: customMessage
              });
              mqttClient.publish('sms/send', payload);
              showPopup(`Message for "${contact.name}" issued.`, 'success');
            }, 50);
          } else {
            showPopup('MQTT not connected, cannot send SMS', 'error');
          }
        }
      },
      {
        label: 'NO',
        onClick: () => {
          setTimeout(() => {
            showPopup('Sending of message is cancelled.', 'info');
          }, 50);
        }
      }
    ]);
  };

  // ---------- Phone formatting ----------
  const formatPhone = (input) => {
    const digits = input.replace(/\D/g, '');
    let normalized = digits.startsWith('63') ? digits : '63' + digits;
    normalized = normalized.slice(0, 12);
    return '+' + normalized;
  };

  const handleEditChange = (field, value) => {
    if (field === 'phone') {
      value = formatPhone(value);
    }
    setEditForm({ ...editForm, [field]: value });
  };

  // ---------- Render ----------
  const recipientOptions = contacts.map(c => ({ label: c.name, value: c.name }));

  return (
    <div className="tab-layout">
      {/* LEFT PANEL – CONTACTS */}
      <div className="card-panel" id='contacts-panel'>
        <div className="panel-header-row">
          <h2 className="panel-title">CONTACTS</h2>
          <button className="add-btn" onClick={handleAdd} disabled={isSaving}>
            {isSaving ? <i className="pi pi-spin pi-spinner" /> : '+ ADD CONTACT'}
          </button>
        </div>

        {/* TABLE WRAPPER */}
        <div className="table-fixed-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>RECIPIENT NAME</th>
                <th style={{ width: '30%' }}>PHONE NUMBER</th>
                <th style={{ width: '20%' }}>ALERT LEVEL</th>
                <th style={{ width: '20%' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {editingIndex === 'new' && (
                <tr className="fixed-row adding-mode">
                   <td><input autoFocus className="table-input" placeholder="Name..." value={editForm.name} onChange={(e) => handleEditChange('name', e.target.value)} disabled={isSaving} /></td>
                   <td><input className="table-input" value={editForm.phone} onChange={(e) => handleEditChange('phone', e.target.value)} disabled={isSaving} /></td>
                   <td><Dropdown className="table-dropdown" value={editForm.alertLevel} options={alertLevelOptions} onChange={(e) => handleEditChange('alertLevel', e.value)} disabled={isSaving} /></td>
                  <td className="action-cell">
                    <button className="icon-only-btn save" onClick={handleSaveEdit} disabled={isSaving}>
                      {isSaving ? <i className="pi pi-spin pi-spinner" /> : '✓'}
                    </button>
                    <button className="icon-only-btn cancel" onClick={handleCancel} disabled={isSaving}>✕</button>
                  </td>
                </tr>
              )}

              {contacts.map((contact, index) => (
                <tr key={contact.id} className={editingIndex === index ? "fixed-row adding-mode" : "fixed-row"}>
                  {editingIndex === index ? (
                    <>
                      <td><input className="table-input" value={editForm.name} onChange={(e) => handleEditChange('name', e.target.value)} disabled={isSaving} /></td>
                      <td><input className="table-input" value={editForm.phone} onChange={(e) => handleEditChange('phone', e.target.value)} disabled={isSaving} /></td>
                      <td><Dropdown className="table-dropdown" value={editForm.alertLevel} options={alertLevelOptions} onChange={(e) => handleEditChange('alertLevel', e.value)} disabled={isSaving} /></td>
                      <td className="action-cell">
                        <button className="icon-only-btn save" onClick={handleSaveEdit} disabled={isSaving}>
                          {isSaving ? <i className="pi pi-spin pi-spinner" /> : '✓'}
                        </button>
                        <button className="icon-only-btn cancel" onClick={handleCancel} disabled={isSaving}>✕</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{contact.name}</td>
                      <td>{contact.phone}</td>
                      <td><span className={`badge ${contact.alertLevel.toLowerCase()}`}>{contact.alertLevel}</span></td>
                      <td className="action-cell">
                        <button className="icon-only-btn edit" onClick={() => handleEdit(index)} disabled={isSaving}>✎</button>
                        <button className="icon-only-btn del" onClick={() => handleDelete(index)} disabled={isSaving}>✕</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sms-testing-section">
          <h3 className="panel-title">SMS TESTING</h3>
          <div className="sms-form-subcard">
            <div className="form-row">
              <label>TYPE MESSAGE</label>
              <textarea
                className="modern-textarea"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="form-row align-center">
              <label>SEND TO</label>
              <div className="send-group">
                <Dropdown
                  value={selectedRecipient}
                  options={recipientOptions}
                  onChange={(e) => setSelectedRecipient(e.value)}
                  placeholder="Select Recipient"
                  className="sms-dropdown"
                  disabled={isSaving}
                />
                <button className="send-btn primary" onClick={handleSend} disabled={isSaving}>SEND MESSAGE</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL – SMS LOGS */}
      <div className="card-panel right-flex">
        <div className="panel-header-row">
          <h2 className="panel-title">SMS LOGS</h2>
        </div>
        <div className="logs-container">
          <div className="logs-scrollable">
            <table className="logs-table">
              <tbody>
                {smsLogs.map((log, idx) => (
                  <tr key={idx} className={`log-row ${log.color}`}>
                    <td className="l-time">{log.time}</td>
                    <td className="l-tag">[{log.type === 'alert' ? 'ALRT' : 'MANUAL'}]</td>
                    <td className="l-sender">{log.recipient}:</td>
                    <td className="l-msg">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Popup */}
      {popup.visible && (
        <Popup
          message={popup.message}
          severity={popup.severity}
          buttons={popup.buttons}
          onClose={closePopup}
        />
      )}
    </div>
  );
};

export default ContactsTab;