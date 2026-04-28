import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Dropdown } from 'primereact/dropdown';
import mqtt from 'mqtt';

const currentIP = window.location.hostname || 'rivermonitoring.local';
const MQTT_BROKER = `ws://${currentIP}:9001`;
const API_BASE = `http://${currentIP}:5000/api`;
const CONTACTS_LIST_TOPIC = 'contacts/list';
const CONTACTS_UPDATE_TOPIC = 'contacts/update';
const SMS_COMMAND_TOPIC = 'sms/command';
const SMS_LOG_TOPIC = 'sms/log';

// ---------- Popup Component ----------
const Popup = ({
  message,
  severity,
  onClose,
  buttons = [{ label: 'OK', onClick: null, autoClose: true }],
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleButtonClick = (btn) => {
    if (btn.onClick) btn.onClick();
    if (btn.autoClose !== false) onClose();
  };

  const isSingleButton = buttons.length === 1;

  return ReactDOM.createPortal(
    <div
      className="notification-overlay"
      onClick={onClose}
    >
      <div
        className={`notification-card ${severity}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="notification-close-x"
          onClick={onClose}
        >
          ×
        </button>
        <div className="notification-header">
          <h3>
            {severity === 'error'
              ? '⚠️ ERROR'
              : severity === 'success'
                ? '✓ SUCCESS'
                : 'ℹ️ INFORMATION'}
          </h3>
        </div>
        <div className="notification-body">
          <p>{message}</p>
        </div>
        <div
          className={`notification-footer ${isSingleButton ? 'footer-left' : ''}`}
        >
          {buttons.map((btn, idx) => (
            <button
              key={idx}
              className={
                idx === 0
                  ? 'notification-primary-btn'
                  : 'notification-secondary-btn'
              }
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

  // --- NEW: Incremental ID State ---
  const [testCounter, setTestCounter] = useState(() => {
    const saved = localStorage.getItem('sms_test_counter');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [customMessage, setCustomMessage] = useState("");

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

  useEffect(() => {
    const fetchSmsLogs = async () => {
      try {
        const response = await fetch(`${API_BASE}/sms_logs`);
        if (response.ok) {
          const data = await response.json();
          setSmsLogs(data);
        }
      } catch (error) {
        console.error("Error fetching SMS logs:", error);
      }
    };

    fetchSmsLogs();
    const logInterval = setInterval(fetchSmsLogs, 5000); 
    return () => clearInterval(logInterval);
  }, []);

  // --- Effect to update message when counter changes ---
  useEffect(() => {
    const paddedId = String(testCounter).padStart(3, '0');
    setCustomMessage(`Test ID: ${paddedId} Status: GSM Link Verification.`);
    localStorage.setItem('sms_test_counter', testCounter);
  }, [testCounter]);

  // ---------- Load logs from localStorage ----------
  useEffect(() => {
    const savedLogs = localStorage.getItem('smsLogs');
    if (savedLogs) {
      try {
        setSmsLogs(JSON.parse(savedLogs));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('smsLogs', JSON.stringify(smsLogs));
  }, [smsLogs]);

  // ---------- MQTT Connection ----------
  useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER);
    client.on('connect', () => {
      console.log('ContactsTab: MQTT connected');
      client.subscribe(CONTACTS_LIST_TOPIC);
      client.subscribe(SMS_LOG_TOPIC);
    });
    client.on('message', (topic, message) => {
      if (topic === CONTACTS_LIST_TOPIC) {
        try {
          const data = JSON.parse(message.toString());
          setContacts(data);
        } catch (e) {
          console.error('Failed to parse contacts list', e);
        }
      } else if (topic === SMS_LOG_TOPIC) {
        try {
          const log = JSON.parse(message.toString());
          setSmsLogs(prev => [log, ...prev].slice(0, 50));
        } catch (e) {
          console.error('Failed to parse SMS log', e);
        }
      }
    });
    setMqttClient(client);
    return () => {
      if (client) client.end();
    };
  }, []);

  const publishContacts = (updatedContacts) => {
    if (mqttClient && mqttClient.connected) {
      mqttClient.publish(CONTACTS_UPDATE_TOPIC, JSON.stringify(updatedContacts));
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
        const newContact = { ...editForm, id: Date.now() };
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
      showPopup('Error saving contact.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isSaving) return;
    setEditingIndex(-1);
  };

  const handleDelete = (index) => {
    if (isSaving) return;
    const contactName = contacts[index].name;
    showPopup(`Delete contact "${contactName}"?`, 'info', [
      {
        label: 'YES',
        onClick: () => {
          setIsSaving(true);
          const updatedContacts = contacts.filter((_, i) => i !== index);
          setContacts(updatedContacts);
          publishContacts(updatedContacts);
          showPopup(`Contact deleted.`, 'success');
          setIsSaving(false);
        }
      },
      { label: 'NO', onClick: () => {} }
    ]);
  };

  // ---------- Manual SMS sending (NOW INCREMENTAL) ----------
  const handleSend = () => {
    if (!selectedRecipient) {
      showPopup('Please select a recipient', 'error');
      return;
    }
    
    // Find the actual contact object based on the name selected in the dropdown
    const contact = contacts.find(c => c.name === selectedRecipient);
    if (!contact) return;

    showPopup(`Send message to "${contact.name}"?`, 'info', [
      {
        label: 'YES',
        autoClose: false,
        onClick: () => {
          closePopup();
          if (mqttClient && mqttClient.connected) {
            
            const payload = JSON.stringify({
              command: "SEND_TEST_SMS",
              phone: contact.phone,
              name: contact.name, 
              message: customMessage
            });
            
            mqttClient.publish(SMS_COMMAND_TOPIC, payload);
            setTestCounter(prev => prev + 1);
            showPopup('SMS command sent to ESP32', 'success');
          } else {
            showPopup('MQTT not connected', 'error');
          }
        }
      },
      { label: 'NO', onClick: () => {} }
    ]);
  };

  const formatPhone = (input) => {
    const digits = input.replace(/\D/g, '');
    let normalized = digits.startsWith('63') ? digits : '63' + digits;
    normalized = normalized.slice(0, 12);
    return '+' + normalized;
  };

  const handleEditChange = (field, value) => {
    if (field === 'phone') value = formatPhone(value);
    setEditForm({ ...editForm, [field]: value });
  };

  const recipientOptions = contacts.map(c => ({ label: c.name, value: c.name }));

  return (
    <div className="tab-layout">
      <div className="card-panel" id='contacts-panel'>
        <div className="panel-header-row">
          <h2 className="panel-title">CONTACTS</h2>
          <button className="add-btn" onClick={handleAdd} disabled={isSaving}>
            {isSaving ? <i className="pi pi-spin pi-spinner" /> : '+ ADD CONTACT'}
          </button>
        </div>

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
                  <td>
                    <input
                      autoFocus
                      className="table-input"
                      placeholder="Name..."
                      value={editForm.name}
                      onChange={(e) => handleEditChange('name', e.target.value)}
                      disabled={isSaving}
                    />
                  </td>
                  <td>
                    <input
                      className="table-input"
                      value={editForm.phone}
                      onChange={(e) => handleEditChange('phone', e.target.value)}
                      disabled={isSaving}
                    />
                  </td>
                  <td>
                    <Dropdown
                      className="table-dropdown"
                      value={editForm.alertLevel}
                      options={alertLevelOptions}
                      onChange={(e) => handleEditChange('alertLevel', e.value)}
                      disabled={isSaving}
                    />
                  </td>
                  <td className="action-cell">
                    <button
                      className="icon-only-btn save"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                    >
                      ✓
                    </button>
                    <button
                      className="icon-only-btn cancel"
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              )}
              {contacts.map((contact, index) => (
                <tr
                  key={contact.id}
                  className={editingIndex === index ? 'fixed-row adding-mode' : 'fixed-row'}
                >
                  {editingIndex === index ? (
                    <>
                      <td>
                        <input
                          className="table-input"
                          value={editForm.name}
                          onChange={(e) => handleEditChange('name', e.target.value)}
                          disabled={isSaving}
                        />
                      </td>
                      <td>
                        <input
                          className="table-input"
                          value={editForm.phone}
                          onChange={(e) => handleEditChange('phone', e.target.value)}
                          disabled={isSaving}
                        />
                      </td>
                      <td>
                        <Dropdown
                          className="table-dropdown"
                          value={editForm.alertLevel}
                          options={alertLevelOptions}
                          onChange={(e) => handleEditChange('alertLevel', e.value)}
                          disabled={isSaving}
                        />
                      </td>
                      <td className="action-cell">
                        <button
                          className="icon-only-btn save"
                          onClick={handleSaveEdit}
                          disabled={isSaving}
                        >
                          ✓
                        </button>
                        <button
                          className="icon-only-btn cancel"
                          onClick={handleCancel}
                          disabled={isSaving}
                        >
                          ✕
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{contact.name}</td>
                      <td>{contact.phone}</td>
                      <td>
                        <span className={`badge ${contact.alertLevel.toLowerCase()}`}>
                          {contact.alertLevel}
                        </span>
                      </td>
                      <td className="action-cell">
                        <button
                          className="icon-only-btn edit"
                          onClick={() => handleEdit(index)}
                          disabled={isSaving}
                        >
                          ✎
                        </button>
                        <button
                          className="icon-only-btn del"
                          onClick={() => handleDelete(index)}
                          disabled={isSaving}
                        >
                          ✕
                        </button>
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
                <button
                  className="send-btn primary"
                  onClick={handleSend}
                  disabled={isSaving}
                >
                  SEND MESSAGE
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-panel right-flex">
        <div className="panel-header-row">
          <h2 className="panel-title">SMS LOGS</h2>
        </div>
        <div className="logs-container">
          <div className="logs-scrollable">
            <table className="logs-table">
              <tbody>
                {smsLogs.length === 0 ? (
                  <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>No SMS logs found.</td></tr>
                ) : (
                  smsLogs.map((log, idx) => (
                    <tr key={log.id || idx} className={`log-row ${log.log_type === 'ALERT' ? 'alrt' : 'maint'}`}>
                      <td className="l-time">{log.timestamp || "--:--"}</td>
                      <td className="l-tag">[{log.log_type === 'ALERT' ? 'ALERT' : 'TEST'}]</td>
                      <td className="l-sender" style={{ textTransform: 'none'}}>
                        <strong>{log.recipient_name}</strong> ({log.recipient_phone})
                      </td>
                      <td className="l-msg" style={{ textTransform: 'none'}}>{log.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {popup.visible && (
        <Popup message={popup.message} severity={popup.severity} buttons={popup.buttons} onClose={closePopup} />
      )}
    </div>
  );
};

export default ContactsTab;