const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// Serve static files from root
app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  maxAge: '1h'
}));

// ============================================================
// POST /api/send-email — Proxy email send to Salesforce Apex REST
// ============================================================
app.post('/api/send-email', async (req, res) => {
  const { email, firstName, lastName, product } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'email required' });
  }

  // Salesforce connection via env vars
  const sfInstanceUrl = process.env.SF_INSTANCE_URL;
  const sfAccessToken = process.env.SF_ACCESS_TOKEN;

  if (!sfInstanceUrl || !sfAccessToken) {
    console.warn('[Email] SF credentials not configured — simulating send');
    // In demo mode without SF credentials, simulate success
    return res.json({
      success: true,
      message: 'Email simulated (SF credentials not configured)',
      email: email,
      simulated: true
    });
  }

  try {
    const response = await fetch(`${sfInstanceUrl}/services/apexrest/mobi/welcome-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sfAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, firstName, lastName, product })
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }

    if (response.ok) {
      console.log(`[Email] Sent to ${email} via Salesforce`);
      res.json({ success: true, message: `Email sent to ${email}`, data });
    } else {
      console.error(`[Email] SF error: ${response.status}`, text);
      res.status(response.status).json({ error: 'Salesforce email failed', details: data });
    }
  } catch (err) {
    console.error('[Email] Network error:', err.message);
    res.status(500).json({ error: 'Failed to connect to Salesforce', message: err.message });
  }
});

// Fallback to index.html for clean URLs
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Mobiliar Demo running on port ${PORT}`);
});
