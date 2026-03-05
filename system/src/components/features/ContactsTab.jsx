import React, { useState } from 'react';
import { Dropdown } from 'primereact/dropdown';

const ContactsTab = () => {
  // --- Data & State ---
  const [contacts] = useState([
    { name: 'Administrator/s', phone: '+63 XXX XXX XXXX', alertLevel: 'ALL ALERT LEVELS' },
    { name: 'Brgy. Officials', phone: '+63 XXX XXX XXXX', alertLevel: 'CRITICAL ALERT LEVELS' },
  ]);

  const recipientOptions = contacts.map(c => ({ label: c.name, value: c.name }));
  const [selectedRecipient, setSelectedRecipient] = useState(null);

  // Static Logs
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

  // --- INTERACTION HANDLERS ---
  const handleEdit = (name) => {
    alert(`Edit clicked for: ${name}`);
  };

  const handleAdd = () => {
    alert("Add New Contact clicked!");
  };

  const handleSave = () => {
    alert("Save Changes clicked!");
  };

  return (
    <div className="card-wrapper" style={{ flexDirection: 'row', padding: 0, background: 'transparent', boxShadow: 'none' }}>
      {/* Add bottom padding to the two-column layout to account for the fixed footer */}
      <div className="two-column-layout" style={{ display: 'flex', gap: '1rem', paddingBottom: '40px'}}>
        
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
                      <td>{contact.name}</td>
                      <td>{contact.phone}</td>
                      <td>{contact.alertLevel}</td>
                      <td>
                        <button 
                          className="table-action-btn" 
                          onClick={() => handleEdit(contact.name)}
                        >
                          EDIT
                        </button>
                      </td>
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
                  <div className="form-input-container">
                    <Dropdown 
                      value={selectedRecipient} 
                      onChange={(e) => setSelectedRecipient(e.value)} 
                      options={recipientOptions} 
                      placeholder="Select Recipient" 
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div> {/* end innercard-container */}
        </div>

        {/* --- RIGHT CARD (SMS LOGS) --- */}
        <div className="card-container" id="smslogs-card" style={{ flex: '1', minWidth: 0 }}>    {/* right card - 1/3 */}
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