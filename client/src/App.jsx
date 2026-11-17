import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Anchor, Compass, Layers, BarChart3,
  Plus, Edit2, Trash2, X, Search,
  DollarSign, Box, MapPin
} from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [activeTab, setActiveTab]     = useState('dashboard');
  const [metrics, setMetrics]         = useState(null);
  const [wrecks, setWrecks]           = useState([]);
  const [artifacts, setArtifacts]     = useState([]);
  const [expeditions, setExpeditions] = useState([]);
  const [search, setSearch]           = useState('');
  const [modalOpen, setModalOpen]     = useState(false);
  const [currentWreck, setCurrentWreck] = useState(null);
  const [formData, setFormData] = useState({
    name: '', ship_type: '', nationality: '',
    sinking_date: '', cause_of_sinking: '',
    discovery_date: '', status: 'located',
    historical_significance: ''
  });

  useEffect(() => {
    fetchMetrics();
    fetchWrecks();
    fetchArtifacts();
    fetchExpeditions();
  }, []);

  const fetchMetrics    = () => axios.get(`${API_BASE}/metrics`).then(r => setMetrics(r.data)).catch(console.error);
  const fetchWrecks     = () => axios.get(`${API_BASE}/wrecks`).then(r => setWrecks(r.data)).catch(console.error);
  const fetchArtifacts  = () => axios.get(`${API_BASE}/artifacts`).then(r => setArtifacts(r.data)).catch(console.error);
  const fetchExpeditions= () => axios.get(`${API_BASE}/expeditions`).then(r => setExpeditions(r.data)).catch(console.error);

  const handleOpenModal = (wreck = null) => {
    if (wreck) {
      setCurrentWreck(wreck);
      setFormData({
        name:                   wreck.name || '',
        ship_type:              wreck.ship_type || '',
        nationality:            wreck.nationality || '',
        sinking_date:           wreck.sinking_date   ? wreck.sinking_date.substring(0, 10)   : '',
        cause_of_sinking:       wreck.cause_of_sinking || '',
        discovery_date:         wreck.discovery_date  ? wreck.discovery_date.substring(0, 10) : '',
        status:                 wreck.status || 'located',
        historical_significance:wreck.historical_significance || ''
      });
    } else {
      setCurrentWreck(null);
      setFormData({ name:'', ship_type:'', nationality:'', sinking_date:'', cause_of_sinking:'', discovery_date:'', status:'located', historical_significance:'' });
    }
    setModalOpen(true);
  };

  const handleSaveWreck = async (e) => {
    e.preventDefault();
    try {
      if (currentWreck) {
        await axios.put(`${API_BASE}/wrecks/${currentWreck.wreck_id}`, formData);
      } else {
        await axios.post(`${API_BASE}/wrecks`, formData);
      }
      setModalOpen(false);
      fetchWrecks();
      fetchMetrics();
    } catch (err) {
      alert('Error saving: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      try {
        await axios.delete(`${API_BASE}/wrecks/${id}`);
        fetchWrecks();
        fetchMetrics();
      } catch (err) {
        alert('Error: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const filteredWrecks = wrecks.filter(w =>
    w.name?.toLowerCase().includes(search.toLowerCase()) ||
    w.nationality?.toLowerCase().includes(search.toLowerCase()) ||
    w.ship_type?.toLowerCase().includes(search.toLowerCase())
  );

  const maxNat = Math.max(1, ...(metrics?.charts?.nationalityDistribution || []).map(x => parseInt(x.count)));
  const maxCon = Math.max(1, ...(metrics?.charts?.conditionDistribution    || []).map(x => parseInt(x.count)));

  const badgeClass = (s) => {
    if (!s) return '';
    if (s === 'protected') return 'badge-protected';
    if (s === 'located')   return 'badge-located';
    return 'badge-salvaged';
  };

  return (
    <div className="app-container">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="brand"><Anchor size={26} /><span>Shipwreck Archive</span></div>
        <ul className="nav-links">
          {[
            { id:'dashboard',   icon:<BarChart3 size={18}/>, label:'Dashboard'      },
            { id:'wrecks',      icon:<Compass   size={18}/>, label:'Wrecks Catalog' },
            { id:'artifacts',   icon:<Layers    size={18}/>, label:'Artifacts'      },
            { id:'expeditions', icon:<MapPin    size={18}/>, label:'Expeditions'    }
          ].map(tab => (
            <li key={tab.id} className={`nav-item ${activeTab===tab.id?'active':''}`}
                onClick={() => setActiveTab(tab.id)}>
              {tab.icon}<span>{tab.label}</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="header-bar">
              <div className="header-title">
                <h1>Maritime Analytics & Metrics</h1>
                <p>Live data from PostgreSQL · <strong>Ship Wreck Archive</strong></p>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div><div className="stat-label">Total Wrecks</div>
                  <div className="stat-val">{metrics?.summary?.totalWrecks ?? '…'}</div></div>
                <Anchor color="#38bdf8" size={32}/>
              </div>
              <div className="stat-card">
                <div><div className="stat-label">Cataloged Artifacts</div>
                  <div className="stat-val">{metrics?.summary?.totalArtifacts ?? '…'}</div></div>
                <Box color="#f59e0b" size={32}/>
              </div>
              <div className="stat-card">
                <div><div className="stat-label">Expeditions Logged</div>
                  <div className="stat-val">{metrics?.summary?.totalExpeditions ?? '…'}</div></div>
                <MapPin color="#10b981" size={32}/>
              </div>
              <div className="stat-card">
                <div><div className="stat-label">Research Funding</div>
                  <div className="stat-val">${(metrics?.summary?.totalBudget || 0).toLocaleString()}</div></div>
                <DollarSign color="#a855f7" size={32}/>
              </div>
            </div>

            <div className="charts-grid">
              <div className="card">
                <h3>Wrecks by Nationality</h3>
                <div className="metric-bar-container">
                  {(metrics?.charts?.nationalityDistribution || []).map((item, i) => (
                    <div key={i} className="bar-row">
                      <div className="bar-header">
                        <span>{item.nationality}</span>
                        <span>{item.count} vessel(s)</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${(parseInt(item.count)/maxNat)*100}%` }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3>Artifact Condition Distribution</h3>
                <div className="metric-bar-container">
                  {(metrics?.charts?.conditionDistribution || []).map((item, i) => {
                    const color = item.condition==='excellent'?'#10b981':item.condition==='good'?'#38bdf8':item.condition==='fair'?'#f59e0b':'#ef4444';
                    return (
                      <div key={i} className="bar-row">
                        <div className="bar-header">
                          <span style={{textTransform:'capitalize'}}>{item.condition}</span>
                          <span>{item.count} item(s)</span>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width:`${(parseInt(item.count)/maxCon)*100}%`, backgroundColor:color }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WRECKS */}
        {activeTab === 'wrecks' && (
          <div>
            <div className="header-bar">
              <div className="header-title">
                <h1>Shipwreck Directory</h1>
                <p>Manage wreck records — create, search, edit, delete</p>
              </div>
              <button className="btn-primary" onClick={() => handleOpenModal()}>
                <Plus size={18}/><span>Add Wreck</span>
              </button>
            </div>

            <div style={{marginBottom:'20px', position:'relative', width:'340px'}}>
              <input type="text" placeholder="Search vessel, nationality, type…"
                value={search} onChange={e => setSearch(e.target.value)}
                style={{width:'100%',padding:'10px 14px 10px 38px',backgroundColor:'#13203f',border:'1px solid #1e293b',borderRadius:'8px',color:'#fff'}}
              />
              <Search size={18} style={{position:'absolute',left:'12px',top:'12px',color:'#64748b'}}/>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Vessel Name</th><th>Type</th><th>Nationality</th>
                    <th>Sunk Date</th><th>Cause</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWrecks.map(w => (
                    <tr key={w.wreck_id}>
                      <td>#{w.wreck_id}</td>
                      <td style={{fontWeight:600}}>{w.name}</td>
                      <td>{w.ship_type}</td>
                      <td>{w.nationality}</td>
                      <td>{w.sinking_date ? w.sinking_date.substring(0,10) : 'N/A'}</td>
                      <td>{w.cause_of_sinking}</td>
                      <td><span className={`status-badge ${badgeClass(w.status)}`}>{w.status}</span></td>
                      <td>
                        <div className="actions-cell">
                          <button className="btn-icon" title="Edit" onClick={() => handleOpenModal(w)}><Edit2 size={16}/></button>
                          <button className="btn-icon delete" title="Delete" onClick={() => handleDelete(w.wreck_id, w.name)}><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredWrecks.length === 0 && (
                    <tr><td colSpan="8" style={{textAlign:'center',padding:'30px',color:'#64748b'}}>No records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ARTIFACTS */}
        {activeTab === 'artifacts' && (
          <div>
            <div className="header-bar">
              <div className="header-title"><h1>Cataloged Artifacts</h1><p>Recovered relics linked to wrecks</p></div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>ID</th><th>Artifact Name</th><th>Wreck</th><th>Category</th><th>Material</th><th>Condition</th><th>Recovered</th></tr>
                </thead>
                <tbody>
                  {artifacts.map(a => (
                    <tr key={a.artifact_id}>
                      <td>#{a.artifact_id}</td>
                      <td style={{fontWeight:600}}>{a.name}</td>
                      <td>{a.vessel_name || `Wreck #${a.wreck_id}`}</td>
                      <td>{a.category}</td>
                      <td>{a.material}</td>
                      <td><span className={`status-badge ${['excellent','good'].includes(a.condition_on_recovery)?'badge-protected':'badge-salvaged'}`}>{a.condition_on_recovery}</span></td>
                      <td>{a.recovery_date ? a.recovery_date.substring(0,10) : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EXPEDITIONS */}
        {activeTab === 'expeditions' && (
          <div>
            <div className="header-bar">
              <div className="header-title"><h1>Expedition Logbook</h1><p>Research missions and operational data</p></div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>ID</th><th>Target Wreck</th><th>Objective</th><th>Budget</th><th>Weather</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {expeditions.map(e => (
                    <tr key={e.expedition_id}>
                      <td>#{e.expedition_id}</td>
                      <td style={{fontWeight:600}}>{e.vessel_name || `Wreck #${e.wreck_id}`}</td>
                      <td>{e.objective}</td>
                      <td>${parseFloat(e.budget||0).toLocaleString()}</td>
                      <td>{e.weather_conditions}</td>
                      <td><span className={`status-badge ${e.status==='completed'?'badge-protected':'badge-located'}`}>{e.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{currentWreck ? 'Edit Shipwreck' : 'Add New Shipwreck'}</h2>
              <button className="btn-icon" onClick={() => setModalOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveWreck}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Vessel Name *</label>
                  <input type="text" required value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}/>
                </div>
                <div className="form-group">
                  <label>Ship Type</label>
                  <input type="text" placeholder="e.g. steamship, galleon" value={formData.ship_type}
                    onChange={e => setFormData({...formData, ship_type: e.target.value})}/>
                </div>
                <div className="form-group">
                  <label>Nationality</label>
                  <input type="text" placeholder="e.g. British, Spanish" value={formData.nationality}
                    onChange={e => setFormData({...formData, nationality: e.target.value})}/>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="protected">Protected</option>
                    <option value="located">Located</option>
                    <option value="partially_salvaged">Partially Salvaged</option>
                    <option value="fully_salvaged">Fully Salvaged</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Date Sunk</label>
                  <input type="date" value={formData.sinking_date}
                    onChange={e => setFormData({...formData, sinking_date: e.target.value})}/>
                </div>
                <div className="form-group">
                  <label>Date Discovered</label>
                  <input type="date" value={formData.discovery_date}
                    onChange={e => setFormData({...formData, discovery_date: e.target.value})}/>
                </div>
                <div className="form-group full">
                  <label>Cause of Sinking</label>
                  <input type="text" value={formData.cause_of_sinking}
                    onChange={e => setFormData({...formData, cause_of_sinking: e.target.value})}/>
                </div>
                <div className="form-group full">
                  <label>Historical Significance</label>
                  <textarea rows="3" value={formData.historical_significance}
                    onChange={e => setFormData({...formData, historical_significance: e.target.value})}/>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{currentWreck ? 'Update Record' : 'Create Wreck'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
