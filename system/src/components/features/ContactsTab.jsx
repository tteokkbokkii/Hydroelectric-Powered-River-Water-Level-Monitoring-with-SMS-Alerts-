import React, { useState } from 'react';
import { Dropdown } from 'primereact/dropdown';

const ContactsTab = () => {
  // --- Load initial contacts from localStorage, or use defaults ---
  const loadInitialContacts = () => {
    const saved = localStorage.getItem('contacts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved contacts', e);
      }
    }
    // Default data – now using valid phone numbers
    return [
      { name: 'Administrator/s', phone: '+630000000001', alertLevel: 'ALL' },
      { name: 'Brgy. Officials', phone: '+630000000002', alertLevel: 'CRITICAL' },
    ];
  };

  const [contacts, setContacts] = useState(loadInitialContacts);

  // Editing state
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editForm, setEditForm] = useState({ name: '', phone: '+63', alertLevel: 'ALL' });

  // Options for alert level dropdown
  const alertLevelOptions = [
    { label: 'ALL', value: 'ALL' },
    { label: 'WARNING', value: 'WARNING' },
    { label: 'CRITICAL', value: 'CRITICAL' },
  ];

  // Recipient options for SMS dropdown (derived from contacts)
  const recipientOptions = contacts.map(c => ({ label: c.name, value: c.name }));
  const [selectedRecipient, setSelectedRecipient] = useState(null);

  // Static Logs (unchanged)
  const logs = [
    { time: '16:45', tag: '[ALRT]', type: 'crit', sender: 'ADMIN', msg: 'LEVEL-CRIT' },
    { time: '16:40', tag: '[ALRT]', type: 'crit', sender: 'ADMIN', msg: 'OPS-SUSPEND' },
    { time: '16:30', tag: '[ALRT]', type: 'crit', sender: 'ADMIN', msg: 'HI-TIDE' },
    { time: '15:00', tag: '[ALRT]', type: 'crit', sender: 'ADMIN', msg: '8.50FT' },
    { time: '14:45', tag: '[MAINT]', type: 'maint', sender: 'ADMIN', msg: 'SENS-CLEAN' },
    { time: '14:00', tag: '[SYS]', type: 'sys', sender: 'ADMIN', msg: 'BATT-CHECK' },
    { time: '13:15', tag: '[MAINT]', type: 'maint', sender: 'ADMIN', msg: 'RE-CALIB' },
    { time: '12:30', tag: '[ALRT]', type: 'crit', sender: 'ALL', msg: '7.80FT' },
  ];

  // --- Phone number helpers ---
  const formatPhone = (input) => {
    // Remove all non‑digits
    const digits = input.replace(/\D/g, '');
    // Ensure it starts with 63 (the country code)
    let normalized = digits.startsWith('63') ? digits : '63' + digits;
    // Take only the first 12 digits (63 + up to 10 digits)
    normalized = normalized.slice(0, 12);
    // Always show the + prefix
    return '+' + normalized;
  };

  const isValidPhone = (phone) => {
    return /^\+63\d{10}$/.test(phone);
  };

  // --- Handlers ---

  // Start editing a row
  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditForm(contacts[index]);
  };

  // Save changes made in edit mode – validate phone before saving
  const handleSaveEdit = () => {
    if (!isValidPhone(editForm.phone)) {
      alert('Phone number must be in the format +63 followed by exactly 10 digits (e.g., +639123456789).');
      return;
    }
    const updatedContacts = [...contacts];
    updatedContacts[editingIndex] = editForm;
    setContacts(updatedContacts);
    setEditingIndex(-1);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingIndex(-1);
  };

  // Delete a contact
  const handleDelete = (index) => {
    if (window.confirm(`Are you sure you want to delete ${contacts[index].name}?`)) {
      const updatedContacts = contacts.filter((_, i) => i !== index);
      setContacts(updatedContacts);
      // If the deleted row was being edited, exit edit mode
      if (editingIndex === index) {
        setEditingIndex(-1);
      } else if (editingIndex > index) {
        // Adjust editing index if a row above was deleted
        setEditingIndex(editingIndex - 1);
      }
    }
  };

  // Add a new blank contact – ensure phone starts with +63
  const handleAdd = () => {
    const newContact = { name: '', phone: '+63', alertLevel: 'ALL' };
    const newIndex = contacts.length; // will be the last index
    setContacts([...contacts, newContact]);
    setEditingIndex(newIndex);
    setEditForm(newContact);
  };

  // SAVE button – persists contacts to localStorage
  const handleSave = () => {
    localStorage.setItem('contacts', JSON.stringify(contacts));
    alert('Contacts saved successfully!');
    console.log('Saved contacts:', contacts);
  };

  // Dummy Send button
  const handleSend = () => {
    alert(`Send SMS to ${selectedRecipient || 'no recipient'}`);
  };

  // Update edit form fields – for phone, apply formatting
  const handleEditChange = (field, value) => {
    if (field === 'phone') {
      value = formatPhone(value);
    }
    setEditForm({ ...editForm, [field]: value });
  };

  return (
    <div className="card-wrapper" style={{ flexDirection: 'row', padding: 0, background: 'transparent', boxShadow: 'none' }}>
      <div className="two-column-layout" style={{ display: 'flex', gap: '1rem', paddingBottom: '40px' }}>
        
        {/* LEFT CARD - CONTACTS */}
        <div className="card-container" id="contacts-card" style={{ flex: '2', minWidth: 0 }}>
          <h2 className="card-title">CONTACTS</h2>
          <div className="innercard-container" id="contacts-contents">
            {/* Scrollable table area */}
            <div className="contacts-scrollable">
              <table className="custom-contacts-table">
                <thead>
                  <tr>
                    <th>RECIPIENT NAME</th>
                    <th>PHONE NUMBER</th>
                    <th>ALERT LEVEL</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact, index) => (
                    <tr key={index}>
                      {editingIndex === index ? (
                        // Edit mode row
                        <>
                          <td>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => handleEditChange('name', e.target.value)}
                              style={{ width: '100%' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={editForm.phone}
                              onChange={(e) => handleEditChange('phone', e.target.value)}
                              style={{ width: '100%' }}
                              placeholder="+63XXXXXXXXXX"
                            />
                          </td>
                          <td>
                            <Dropdown
                              value={editForm.alertLevel}
                              options={alertLevelOptions}
                              onChange={(e) => handleEditChange('alertLevel', e.value)}
                              style={{ width: '100%' }}
                            />
                          </td>
                          <td>
                            <button className="table-action-btn" onClick={handleSaveEdit}>Save</button>
                            <button className="table-action-btn" onClick={handleCancelEdit}>Cancel</button>
                          </td>
                        </>
                      ) : (
                        // View mode row
                        <>
                          <td>{contact.name}</td>
                          <td>{contact.phone}</td>
                          <td>{contact.alertLevel}</td>
                          <td>
                            <button
                              className="table-action-btn"
                              onClick={() => handleEdit(index)}
                            >
                              EDIT
                            </button>
                            <button
                              className="table-action-btn"
                              onClick={() => handleDelete(index)}
                              style={{ marginLeft: '0.5rem' }}
                            >
                              DELETE
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Fixed button bar – right‑aligned */}
            <div className="bottom-controls">
              <button className="control-btn" onClick={handleAdd}>ADD</button>
              <button className="control-btn" onClick={handleSave}>SAVE</button>
            </div>

            {/* SMS section – fixed at bottom */}
            <div className="sms-section">
              <h3 className="subsection-heading">SMS TESTING</h3>
              <div className="sms-form-wrapper">
                <div className="form-row">
                  <div className="form-label">TYPE MESSAGE:</div>
                  <div className="form-input-container">
                    <textarea
                      className="custom-textarea"
                      defaultValue="Test ID: 001 Status: GSM Link Verification Characters: ABCabc123!@# Time: 2025-12-29 11:20"
                    />
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: 0, alignItems: 'center' }}>
                  <div className="form-label">SEND TO:</div>
                  <div className="form-input-container" style={{ display: 'flex', gap: '0.5rem' }}>
                    <Dropdown
                      value={selectedRecipient}
                      onChange={(e) => setSelectedRecipient(e.value)}
                      options={recipientOptions}
                      placeholder="Select Recipient"
                      style={{ width: '100%' }}
                    />
                    <button className="control-btn" onClick={handleSend}>SEND</button>
                  </div>
                </div>
              </div>
            </div>
          </div> {/* end innercard-container */}
        </div>

        {/* RIGHT CARD - SMS LOGS */}
        <div className="card-container" id="smslogs-card" style={{ flex: '1', minWidth: 0 }}>
          <h2 className="card-title">SMS LOGS</h2>
          <div className="innercard-container" id="smslogs-contents">
            <div className="logs-list">
              {logs.map((log, index) => (
                <div key={index} className="log-item">
                  <span className="log-time">{log.time}</span>
                  <span className={`log-tag-${log.type}`}>{log.tag}</span>
                  <span className="log-sender"> {log.sender}: </span>
                  <span className="log-content">{log.msg}</span>
                </div>
              ))}
            </div>
          </div> {/* end innercard-container */}
        </div> {/* end card-container */}

      </div>
    </div>
  );
};

export default ContactsTab;