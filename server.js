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
// POST /api/send-email — Publish Platform Event to Salesforce
// The Apex trigger on Mobi_Email_Notification__e fires the
// branded email asynchronously via the event bus.
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
    console.warn('[Email] SF credentials not configured — simulating Platform Event publish');
    return res.json({
      success: true,
      message: 'Platform Event simulated (SF credentials not configured)',
      email: email,
      simulated: true
    });
  }

  // Build the platform event payload
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Kundin / Kunde';
  const productLabel = product || 'Versicherung';
  const subjectLine = `Willkommen bei der Mobiliar – Ihre ${productLabel}`;

  const platformEvent = {
    Recipient_Email__c: email,
    Recipient_Name__c: fullName,
    Subject_Line__c: subjectLine,
    Product__c: productLabel
  };

  try {
    // Publish Platform Event via Salesforce REST API
    const response = await fetch(
      `${sfInstanceUrl}/services/data/v62.0/sobjects/Mobi_Email_Notification__e`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sfAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(platformEvent)
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      console.log(`[Email] Platform Event published for ${email} (id: ${data.id})`);
      res.json({
        success: true,
        message: `Platform Event published → email will be sent to ${email}`,
        eventId: data.id,
        mechanism: 'Platform Event → Apex Trigger → Branded Email'
      });
    } else {
      console.error(`[Email] SF Platform Event error:`, data);
      res.status(response.status || 500).json({
        error: 'Failed to publish Platform Event',
        details: data
      });
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
