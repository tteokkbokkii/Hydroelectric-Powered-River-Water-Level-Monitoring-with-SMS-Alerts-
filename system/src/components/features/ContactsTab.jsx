import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Dropdown } from 'primereact/dropdown';
import mqtt from 'mqtt';

const MQTT_BROKER = 'ws://172.20.10.5:9001';
const CONTACTS_LIST_TOPIC = 'contacts/list';
const CONTACTS_UPDATE_TOPIC = 'contacts/update';

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

  const isSingleButton = buttons.length === 1;

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
        <div className={`notification-footer ${isSingleButton ? 'footer-left' : ''}`}>
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
  const [isSaving, setIsSaving] = useState(false);
  const [mqttClient, setMqttClient] = useState(null);

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

  // ---------- MQTT Connection ----------
  useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER);
    client.on('connect', () => {
      console.log('ContactsTab: MQTT connected');
      client.subscribe(CONTACTS_LIST_TOPIC);
    });
    client.on('message', (topic, message) => {
      if (topic === CONTACTS_LIST_TOPIC) {
        try {
          const data = JSON.parse(message.toString());
          setContacts(data);
          console.log('Contacts loaded from MQTT');
        } catch (e) {
          console.error('Failed to parse contacts list', e);
        }
      }
    });
    setMqttClient(client);
    return () => {
      if (client) client.end();
    };
  }, []);

  // ---------- Load SMS logs (dummy) ----------
  useEffect(() => {
    const dummyLogs = [
      { time: '16:45', recipient: '+639123456789', message: 'Water level reached CRITICAL levels', type: 'alert', color: 'alrt' },
      { time: '14:30', recipient: '+639987654321', message: 'Test message from admin', type: 'manual', color: 'maint' },
      { time: '12:15', recipient: '+639112233445', message: 'Water level reached WARNING levels', type: 'alert', color: 'alrt' },
    ];
    setSmsLogs(dummyLogs);
  }, []);

  // ---------- Publish contacts to MQTT ----------
  const publishContacts = (updatedContacts) => {
    if (mqttClient && mqttClient.connected) {
      mqttClient.publish(CONTACTS_UPDATE_TOPIC, JSON.stringify(updatedContacts));
      console.log('Contacts published to MQTT');
    } else {
      console.warn('MQTT not connected, contacts not saved');
    }
  };

  // ---------- Contact Handlers ----------
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
      let updatedContacts;
      if (editingIndex === 'new') {
        const newId = Date.now();
        const newContact = { ...editForm, id: newId };
        updatedContacts = [...contacts, newContact];
        showPopup('Contact added successfully!', 'success');
      } else {
        updatedContacts = [...contacts];
        updatedContacts[editingIndex] = { ...editForm, id: contacts[editingIndex].id };
        showPopup('Contact updated successfully!', 'success');
      }
      setContacts(updatedContacts);
      publishContacts(updatedContacts);
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

  const handleDelete = (index) => {
    if (isSaving) return;
    const contactName = contacts[index].name;
    showPopup(`Delete contact "${contactName}"?`, 'info', [
      {
        label: 'YES',
        onClick: () => {
          setTimeout(() => {
            setIsSaving(true);
            try {
              const updatedContacts = contacts.filter((_, i) => i !== index);
              setContacts(updatedContacts);
              publishContacts(updatedContacts);
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

  // ---------- Manual SMS sending (local simulation) ----------
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

    showPopup(`Send message to "${contact.name}"?`, 'info', [
      {
        label: 'YES',
        onClick: () => {
          setTimeout(() => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-GB', { hour12: false }).slice(0,5);
            const newLog = {
              time: timeStr,
              recipient: contact.phone,
              message: customMessage,
              type: 'manual',
              color: 'maint'
            };
            setSmsLogs(prev => [newLog, ...prev].slice(0, 50));
            showPopup(`Message for "${contact.name}" issued.`, 'success');
          }, 50);
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