const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// Health check
// ----------------------------------------------------
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT current_database(), NOW()');
    res.json({ status: 'connected', db: result.rows[0].current_database, time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ----------------------------------------------------
// Metrics / Dashboard
// ----------------------------------------------------
app.get('/api/metrics', async (req, res) => {
  try {
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM wrecks)       AS total_wrecks,
        (SELECT COUNT(*) FROM artifacts)    AS total_artifacts,
        (SELECT COUNT(*) FROM expeditions)  AS total_expeditions,
        (SELECT COALESCE(SUM(budget), 0) FROM expeditions) AS total_budget
    `);

    const nationalityDistribution = await pool.query(`
      SELECT nationality, COUNT(*) AS count 
      FROM wrecks 
      WHERE nationality IS NOT NULL 
      GROUP BY nationality 
      ORDER BY count DESC 
      LIMIT 6
    `);

    const conditionDistribution = await pool.query(`
      SELECT condition_on_recovery AS condition, COUNT(*) AS count 
      FROM artifacts 
      WHERE condition_on_recovery IS NOT NULL 
      GROUP BY condition_on_recovery
    `);

    const expeditionStatuses = await pool.query(`
      SELECT status AS expedition_status, COUNT(*) AS count 
      FROM expeditions 
      WHERE status IS NOT NULL 
      GROUP BY status
    `);

    res.json({
      summary: {
        totalWrecks:      parseInt(counts.rows[0].total_wrecks, 10),
        totalArtifacts:   parseInt(counts.rows[0].total_artifacts, 10),
        totalExpeditions: parseInt(counts.rows[0].total_expeditions, 10),
        totalBudget:      parseFloat(counts.rows[0].total_budget)
      },
      charts: {
        nationalityDistribution: nationalityDistribution.rows,
        conditionDistribution:   conditionDistribution.rows,
        expeditionStatuses:      expeditionStatuses.rows
      }
    });
  } catch (err) {
    console.error('Metrics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// CRUD: WRECKS
// ----------------------------------------------------
app.get('/api/wrecks', async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = `
      SELECT w.*, l.sea_region, l.country_jurisdiction, l.depth_meters 
      FROM wrecks w
      LEFT JOIN locations l ON w.location_id = l.location_id
    `;
    const params = [];
    const conditions = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(w.name ILIKE $${params.length} OR w.ship_type ILIKE $${params.length} OR w.nationality ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status);
      conditions.push(`w.status = $${params.length}`);
    }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY w.wreck_id ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Wrecks error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/wrecks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const wreck = await pool.query('SELECT * FROM wrecks WHERE wreck_id = $1', [id]);
    if (wreck.rows.length === 0) return res.status(404).json({ error: 'Wreck not found' });

    const artifacts   = await pool.query('SELECT * FROM artifacts   WHERE wreck_id = $1', [id]);
    const expeditions = await pool.query('SELECT * FROM expeditions WHERE wreck_id = $1', [id]);

    res.json({ ...wreck.rows[0], artifacts: artifacts.rows, expeditions: expeditions.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wrecks', async (req, res) => {
  try {
    const {
      name, ship_type, nationality, sinking_date,
      cause_of_sinking, discovery_date, location_id,
      historical_significance, status
    } = req.body;

    const result = await pool.query(`
      INSERT INTO wrecks (name, ship_type, nationality, sinking_date, cause_of_sinking, discovery_date, location_id, historical_significance, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [name, ship_type, nationality, sinking_date || null, cause_of_sinking, discovery_date || null, location_id || null, historical_significance, status]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create wreck error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/wrecks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, ship_type, nationality, sinking_date,
      cause_of_sinking, discovery_date, location_id,
      historical_significance, status
    } = req.body;

    const result = await pool.query(`
      UPDATE wrecks SET
        name=$1, ship_type=$2, nationality=$3, sinking_date=$4,
        cause_of_sinking=$5, discovery_date=$6, location_id=$7,
        historical_significance=$8, status=$9
      WHERE wreck_id=$10
      RETURNING *
    `, [name, ship_type, nationality, sinking_date || null, cause_of_sinking, discovery_date || null, location_id || null, historical_significance, status, id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Wreck not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/wrecks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM wrecks WHERE wreck_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Wreck not found' });
    res.json({ message: 'Deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// READ: Artifacts, Locations, Expeditions
// ----------------------------------------------------
app.get('/api/artifacts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, w.name AS vessel_name
      FROM artifacts a
      LEFT JOIN wrecks w ON a.wreck_id = w.wreck_id
      ORDER BY a.artifact_id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/locations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations ORDER BY location_id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/expeditions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, w.name AS vessel_name
      FROM expeditions e
      LEFT JOIN wrecks w ON e.wreck_id = w.wreck_id
      ORDER BY e.expedition_id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
