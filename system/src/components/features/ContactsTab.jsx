import React, { useState } from 'react';
import { Dropdown } from 'primereact/dropdown';

const ContactsTab = () => {
  const loadInitialContacts = () => {
    const saved = localStorage.getItem('contacts');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      { name: 'Aliyah', phone: '+63', alertLevel: 'ALL' },
      { name: 'saca', phone: '+63', alertLevel: 'ALL' },
      { name: 'fasfasf', phone: '+63', alertLevel: 'ALL' }
    ];
  };

  const [contacts, setContacts] = useState(loadInitialContacts);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editForm, setEditForm] = useState({ name: '', phone: '+63', alertLevel: 'ALL' });
  const [selectedRecipient, setSelectedRecipient] = useState(null);

  const alertLevelOptions = [
    { label: 'ALL', value: 'ALL' },
    { label: 'WARNING', value: 'WARNING' },
    { label: 'CRITICAL', value: 'CRITICAL' }
  ];

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditForm(contacts[index]);
  };

  const handleAdd = () => {
    setEditForm({ name: '', phone: '+63', alertLevel: 'ALL' });
    setEditingIndex('new');
  };

  const handleSaveEdit = () => {
    if (!editForm.name.trim()) return alert("Please enter a name");
    let updatedList;
    if (editingIndex === 'new') {
      updatedList = [...contacts, editForm];
    } else {
      updatedList = [...contacts];
      updatedList[editingIndex] = editForm;
    }
    setContacts(updatedList);
    localStorage.setItem('contacts', JSON.stringify(updatedList));
    setEditingIndex(-1);
  };

  const handleCancel = () => {
    setEditingIndex(-1);
    setEditForm({ name: '', phone: '+63', alertLevel: 'ALL' });
  };

  const handleDelete = (index) => {
    if (window.confirm("Delete this contact?")) {
      const filtered = contacts.filter((_, i) => i !== index);
      setContacts(filtered);
      localStorage.setItem('contacts', JSON.stringify(filtered));
    }
  };

  return (
    <div className="tab-layout">
      {/* LEFT PANEL (GREEN BOX) */}
      <div className="card-panel" id='contacts-panel'>
        <div className="panel-header-row">
          <h2 className="panel-title">CONTACTS</h2>
          <button className="add-btn" onClick={handleAdd}>+ ADD CONTACT</button>
        </div>

        {/* TABLE WRAPPER (BLUE BOX) */}
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
                  <td><input autoFocus className="table-input" placeholder="Name..." value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></td>
                  <td><input className="table-input" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></td>
                  <td><Dropdown className="table-dropdown" value={editForm.alertLevel} options={alertLevelOptions} onChange={(e) => setEditForm({ ...editForm, alertLevel: e.value })} /></td>
                  <td className="action-cell">
                    <button className="icon-only-btn save" onClick={handleSaveEdit}>✓</button>
                    <button className="icon-only-btn cancel" onClick={handleCancel}>✕</button>
                  </td>
                </tr>
              )}

              {contacts.map((contact, index) => (
                <tr key={index} className={editingIndex === index ? "fixed-row adding-mode" : "fixed-row"}>
                  {editingIndex === index ? (
                    <>
                      <td><input className="table-input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></td>
                      <td><input className="table-input" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></td>
                      <td><Dropdown className="table-dropdown" value={editForm.alertLevel} options={alertLevelOptions} onChange={(e) => setEditForm({ ...editForm, alertLevel: e.value })} /></td>
                      <td className="action-cell">
                        <button className="icon-only-btn save" onClick={handleSaveEdit}>✓</button>
                        <button className="icon-only-btn cancel" onClick={handleCancel}>✕</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{contact.name}</td>
                      <td>{contact.phone}</td>
                      <td><span className={`badge ${contact.alertLevel.toLowerCase()}`}>{contact.alertLevel}</span></td>
                      <td className="action-cell">
                        <button className="icon-only-btn edit" onClick={() => handleEdit(index)}>✎</button>
                        <button className="icon-only-btn del" onClick={() => handleDelete(index)}>✕</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sms-testing-section">
          <h3 className="subtitle-sec">SMS TESTING</h3>
          <div className="sms-form-subcard">
            <div className="form-row">
              <label>TYPE MESSAGE</label>
              <textarea className="modern-textarea" defaultValue="Test ID: 001 Status: GSM Link Verification..." />
            </div>
            <div className="form-row align-center">
              <label>SEND TO</label>
              <div className="send-group">
                <Dropdown 
                  value={selectedRecipient} 
                  options={contacts.map(c => ({ label: c.name, value: c.name }))} 
                  onChange={(e) => setSelectedRecipient(e.value)}
                  placeholder="Select Recipient" 
                  className="sms-dropdown" 
                />
                <button className="send-btn primary">SEND MESSAGE</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL (GREEN BOX) */}
      <div className="card-panel right-flex">
        <div className="panel-header-row">
          <h2 className="panel-title">SMS LOGS</h2>
        </div>
        <div className="logs-container"> {/* BLUE BOX */}
          <div className="logs-scrollable">
            <table className="logs-table">
              <tbody>
                {[
                  { time: '16:45', tag: 'ALRT', sender: 'ADMIN', msg: 'LEVEL-CRIT', color: 'alrt' },
                  { time: '14:45', tag: 'MAINT', sender: 'ADMIN', msg: 'SENS-CLEAN', color: 'maint' },
                  { time: '14:00', tag: 'SYS', sender: 'ADMIN', msg: 'BATT-CHECK', color: 'sys' },
                  { time: '12:30', tag: 'ALRT', sender: 'ALL', msg: '7.80FT', color: 'alrt' },
                ].map((log, i) => (
                  <tr key={i} className={`log-row ${log.color}`}>
                    <td className="l-time">{log.time}</td>
                    <td className="l-tag">[{log.tag}]</td>
                    <td className="l-sender">{log.sender}:</td>
                    <td className="l-msg">{log.msg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactsTab;