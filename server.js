const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// Serve static files from root (no cache for dev/demo)
app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  maxAge: 0,
  etag: false
}));

// ============================================================
// Salesforce Auth Helper — supports two modes:
//   1. OAuth Client Credentials (preferred, auto-refreshing)
//      Requires: SF_CLIENT_ID, SF_CLIENT_SECRET, SF_LOGIN_URL
//   2. Static Access Token (fallback)
//      Requires: SF_INSTANCE_URL, SF_ACCESS_TOKEN
// Returns { instanceUrl, accessToken } or null if unconfigured.
// ============================================================
let _cachedToken = null;
let _tokenExpiry = 0;

async function getSalesforceAuth() {
  const clientId = process.env.SF_CLIENT_ID;
  const clientSecret = process.env.SF_CLIENT_SECRET;
  const loginUrl = process.env.SF_LOGIN_URL;

  // Mode 1: OAuth Client Credentials (auto-refreshing)
  if (clientId && clientSecret && loginUrl) {
    const now = Date.now();
    if (_cachedToken && now < _tokenExpiry) {
      return _cachedToken;
    }

    try {
      const tokenUrl = `${loginUrl}/services/oauth2/token`;
      const resp = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`
      });
      const data = await resp.json();

      if (data.access_token && data.instance_url) {
        _cachedToken = {
          instanceUrl: data.instance_url,
          accessToken: data.access_token
        };
        // Cache for 55 minutes (tokens typically last 60 min)
        _tokenExpiry = now + 55 * 60 * 1000;
        console.log('[Auth] OAuth token obtained via client credentials');
        return _cachedToken;
      } else {
        console.error('[Auth] OAuth token request failed:', data);
        return null;
      }
    } catch (err) {
      console.error('[Auth] OAuth token error:', err.message);
      return null;
    }
  }

  // Mode 2: Static token (fallback)
  const sfInstanceUrl = process.env.SF_INSTANCE_URL;
  const sfAccessToken = process.env.SF_ACCESS_TOKEN;
  if (sfInstanceUrl && sfAccessToken) {
    return { instanceUrl: sfInstanceUrl, accessToken: sfAccessToken };
  }

  return null; // Unconfigured
}

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

  const auth = await getSalesforceAuth();
  if (!auth) {
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
      `${auth.instanceUrl}/services/data/v62.0/sobjects/Mobi_Email_Notification__e`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
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

// ============================================================
// POST /api/register-event — Register for an event
// Creates or finds a Lead, then creates an Event_Registration__c
// record linked to both the Event Instance and the Lead.
// ============================================================
app.post('/api/register-event', async (req, res) => {
  const { eventId, firstName, lastName, email, phone, persons, remarks } = req.body;

  if (!eventId || !firstName || !lastName || !email) {
    return res.status(400).json({ error: 'eventId, firstName, lastName, and email are required' });
  }

  const auth = await getSalesforceAuth();
  if (!auth) {
    console.warn('[Register] SF credentials not configured — simulating registration');
    return res.json({
      success: true,
      message: 'Registration simulated (SF credentials not configured)',
      simulated: true,
      leadId: 'SIMULATED_LEAD_001',
      registrationId: 'SIMULATED_REG_001'
    });
  }

  const apiBase = `${auth.instanceUrl}/services/data/v62.0`;
  const headers = {
    'Authorization': `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json'
  };

  try {
    // ── Step 1: Find or create Lead by email ──
    let leadId = null;

    // Search for existing Lead
    const searchQuery = encodeURIComponent(
      `SELECT Id FROM Lead WHERE Email = '${email.replace(/'/g, "\\'")}' AND IsConverted = false LIMIT 1`
    );
    const searchResp = await fetch(`${apiBase}/query/?q=${searchQuery}`, { headers });
    const searchData = await searchResp.json();

    if (searchData.totalSize > 0) {
      // Lead exists — update with latest info
      leadId = searchData.records[0].Id;
      console.log(`[Register] Found existing Lead ${leadId} for ${email}`);

      const updatePayload = { FirstName: firstName, LastName: lastName };
      if (phone) updatePayload.Phone = phone;

      await fetch(`${apiBase}/sobjects/Lead/${leadId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updatePayload)
      });
    } else {
      // Create new Lead
      const leadPayload = {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        Company: '[Event-Anmeldung]',
        LeadSource: 'Web',
        Country: 'Switzerland',
        Description: remarks ? `Event-Bemerkung: ${remarks}` : ''
      };
      if (phone) leadPayload.Phone = phone;

      const createResp = await fetch(`${apiBase}/sobjects/Lead`, {
        method: 'POST',
        headers,
        body: JSON.stringify(leadPayload)
      });
      const createData = await createResp.json();

      if (createData.success) {
        leadId = createData.id;
        console.log(`[Register] Created new Lead ${leadId} for ${email}`);
      } else {
        console.error('[Register] Failed to create Lead:', createData);
        return res.status(500).json({ error: 'Failed to create Lead', details: createData });
      }
    }

    // ── Step 2: Also check/create Contact for Event_Registration link ──
    let contactId = null;

    // Search for existing Contact by email
    const contactQuery = encodeURIComponent(
      `SELECT Id FROM Contact WHERE Email = '${email.replace(/'/g, "\\'")}' LIMIT 1`
    );
    const contactResp = await fetch(`${apiBase}/query/?q=${contactQuery}`, { headers });
    const contactData = await contactResp.json();

    if (contactData.totalSize > 0) {
      contactId = contactData.records[0].Id;
      console.log(`[Register] Found existing Contact ${contactId} for ${email}`);
    }
    // If no Contact exists, that's fine — Contact__c is optional on Event_Registration__c

    // ── Step 3: Create Event_Registration__c ──
    const regPayload = {
      Event_Instance__c: eventId,
      Status__c: 'Registered',
      Guest_Role__c: 'Interessent',
      Registration_Date__c: new Date().toISOString()
    };
    if (contactId) regPayload.Contact__c = contactId;

    const regResp = await fetch(`${apiBase}/sobjects/Event_Registration__c`, {
      method: 'POST',
      headers,
      body: JSON.stringify(regPayload)
    });
    const regData = await regResp.json();

    if (regData.success) {
      console.log(`[Register] Created Event_Registration ${regData.id} for Lead ${leadId} → Event ${eventId}`);

      // ── Step 4: Update Lead description with event registration reference ──
      const eventNames = {
        'a32J60000009PwGIAU': 'Mobiliar Familientag',
        'a32J60000009Pw6IAE': 'KMU Forum',
        'a32J60000009PwBIAU': 'Nachhaltigkeits-Dialog',
        'a32J60000009PwLIAU': 'Digital Innovation Night',
        'a32J60000009PvwIAE': 'Zibelemärit-Apéro'
      };
      const eventLabel = eventNames[eventId] || eventId;
      const regNote = `Event-Anmeldung: ${eventLabel} (${new Date().toLocaleDateString('de-CH')})` +
        (persons > 1 ? ` — ${persons} Personen` : '') +
        (remarks ? ` — ${remarks}` : '');

      // Append to Lead description
      const descResp = await fetch(`${apiBase}/query/?q=${encodeURIComponent(`SELECT Description FROM Lead WHERE Id = '${leadId}' LIMIT 1`)}`, { headers });
      const descData = await descResp.json();
      const existingDesc = descData.records?.[0]?.Description || '';
      const newDesc = existingDesc ? `${existingDesc}\n${regNote}` : regNote;

      await fetch(`${apiBase}/sobjects/Lead/${leadId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ Description: newDesc })
      });

      res.json({
        success: true,
        message: 'Anmeldung erfolgreich!',
        leadId,
        registrationId: regData.id,
        contactLinked: !!contactId
      });
    } else {
      console.error('[Register] Failed to create Event_Registration:', regData);
      res.status(500).json({ error: 'Failed to create registration', details: regData });
    }

  } catch (err) {
    console.error('[Register] Error:', err.message);
    res.status(500).json({ error: 'Registration failed', message: err.message });
  }
});

// ============================================================
// POST /api/create-lead — Journey Abandonment → Opportunity Creation
// Called via navigator.sendBeacon when a logged-in user abandons
// a partially filled form (e.g. Prämienrechner / Autoversicherung).
// Creates an Opportunity in Salesforce CRM linked to the existing
// Marc Baumgartner Account, with product interest context.
// ============================================================
app.post('/api/create-lead', async (req, res) => {
  const { email, firstName, lastName, product, source, page, formFields } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'email required' });
  }

  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Kunde';
  const productLabel = product || 'Versicherung';

  console.log(`[Opp] Abandonment Opportunity request: ${email} — ${productLabel} (${page})`);

  const auth = await getSalesforceAuth();
  if (!auth) {
    console.warn('[Opp] SF credentials not configured — simulating Opportunity creation');
    return res.json({
      success: true,
      message: 'Opportunity creation simulated (SF credentials not configured)',
      simulated: true,
      email: email,
      product: productLabel,
      source: source
    });
  }

  const apiBase = `${auth.instanceUrl}/services/data/v62.0`;
  const headers = {
    'Authorization': `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json'
  };

  try {
    // Step 1: Find the Account by email (Contact → AccountId) or fallback to known Account
    let accountId = null;

    // Try to find via Contact email
    const contactQuery = encodeURIComponent(
      `SELECT AccountId FROM Contact WHERE Email = '${email.replace(/'/g, "\\'")}' AND AccountId != null LIMIT 1`
    );
    const contactResp = await fetch(`${apiBase}/query/?q=${contactQuery}`, { headers });
    const contactData = await contactResp.json();

    if (contactData.totalSize > 0) {
      accountId = contactData.records[0].AccountId;
      console.log(`[Opp] Found Account ${accountId} via Contact email`);
    } else {
      // Fallback: search Account by name
      const nameQuery = encodeURIComponent(
        `SELECT Id FROM Account WHERE Name LIKE '%${(lastName || '').replace(/'/g, "\\'")}%' LIMIT 1`
      );
      const nameResp = await fetch(`${apiBase}/query/?q=${nameQuery}`, { headers });
      const nameData = await nameResp.json();

      if (nameData.totalSize > 0) {
        accountId = nameData.records[0].Id;
        console.log(`[Opp] Found Account ${accountId} via name search`);
      }
    }

    if (!accountId) {
      console.warn('[Opp] No Account found — cannot create Opportunity');
      return res.status(404).json({ error: 'No Account found for this user' });
    }

    // Step 2: Build Opportunity description
    const abandonNote = [
      `Journey-Abbruch: ${productLabel}`,
      `Seite: ${page || 'unbekannt'}`,
      `Zeitpunkt: ${new Date().toLocaleString('de-CH')}`,
      formFields?.marke ? `Fahrzeug: ${formFields.marke}` : '',
      formFields?.baujahr ? `Baujahr: ${formFields.baujahr}` : '',
      formFields?.deckung ? `Deckung: ${formFields.deckung}` : '',
      formFields?.km ? `km/Jahr: ${formFields.km}` : '',
      formFields?.plz ? `PLZ: ${formFields.plz}` : '',
    ].filter(Boolean).join('\n');

    // Step 3: Create Opportunity
    // Close date = 30 days from now
    const closeDate = new Date();
    closeDate.setDate(closeDate.getDate() + 30);
    const closeDateStr = closeDate.toISOString().split('T')[0];

    const oppPayload = {
      Name: `${productLabel} – ${fullName}`,
      AccountId: accountId,
      StageName: 'Review',
      CloseDate: closeDateStr,
      Description: abandonNote,
      LeadSource: 'Web'
    };

    const createResp = await fetch(`${apiBase}/sobjects/Opportunity`, {
      method: 'POST',
      headers,
      body: JSON.stringify(oppPayload)
    });
    const createData = await createResp.json();

    if (createData.success) {
      console.log(`[Opp] Created Opportunity ${createData.id} for ${email} on Account ${accountId}`);
      res.json({
        success: true,
        message: `Opportunity created for ${fullName}`,
        opportunityId: createData.id,
        accountId: accountId,
        product: productLabel,
        source: source
      });
    } else {
      console.error('[Opp] Failed to create Opportunity:', createData);
      res.status(500).json({ error: 'Failed to create Opportunity', details: createData });
    }

  } catch (err) {
    console.error('[Opp] Error:', err.message);
    res.status(500).json({ error: 'Opportunity creation failed', message: err.message });
  }
});

// ============================================================
// POST /api/notify-abandonment — Send Custom Notification in SF
// Fires a bell notification in the Salesforce console when a
// logged-in user abandons a form on the website.
// Uses the Mobi_Journey_Abandonment_Alert custom notification type.
// ============================================================
app.post('/api/notify-abandonment', async (req, res) => {
  const { email, firstName, lastName, product, page } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'email required' });
  }

  const auth = await getSalesforceAuth();
  if (!auth) {
    console.warn('[Notify] SF credentials not configured — simulating notification');
    return res.json({
      success: true,
      message: 'Notification simulated (SF credentials not configured)',
      simulated: true
    });
  }

  const apiBase = `${auth.instanceUrl}/services/data/v62.0`;
  const headers = {
    'Authorization': `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json'
  };

  try {
    // Step 1: Find the Custom Notification Type ID
    const notifTypeQuery = encodeURIComponent(
      "SELECT Id FROM CustomNotificationType WHERE DeveloperName = 'Mobi_Journey_Abandonment_Alert' LIMIT 1"
    );
    const notifTypeResp = await fetch(`${apiBase}/query/?q=${notifTypeQuery}`, { headers });
    const notifTypeData = await notifTypeResp.json();

    if (!notifTypeData.records || notifTypeData.records.length === 0) {
      console.error('[Notify] Custom Notification Type not found');
      return res.status(404).json({ error: 'Custom Notification Type not found on org' });
    }
    const notifTypeId = notifTypeData.records[0].Id;

    // Step 2: Notify both known admin users
    const recipientIds = [
      '005J60000037xcJIAQ',  // tbohm@mobiliar-demo.ch (Thomas Bohm)
      '005J60000037rnQIAQ'   // trailsignup.6f8879f26b2d65@salesforce.com (A Solution Engineer)
    ];
    console.log(`[Notify] Sending to ${recipientIds.length} recipients`);

    // Step 3: Find the most recent Opportunity to link the notification to
    let targetId = recipientIds[0]; // default: link to first admin user if no Opportunity found

    // Find Opportunity via Contact email → Account → most recent Opportunity
    const oppQuery = encodeURIComponent(
      `SELECT Id FROM Opportunity WHERE Account.Id IN (SELECT AccountId FROM Contact WHERE Email = '${email.replace(/'/g, "\\'")}') ORDER BY CreatedDate DESC LIMIT 1`
    );
    const oppResp = await fetch(`${apiBase}/query/?q=${oppQuery}`, { headers });
    const oppData = await oppResp.json();
    if (oppData.records && oppData.records.length > 0) {
      targetId = oppData.records[0].Id;
    }

    // Step 4: Send the Custom Notification
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Unbekannt';
    const productLabel = product || 'Versicherung';

    const notifPayload = {
      inputs: [{
        customNotifTypeId: notifTypeId,
        recipientIds: recipientIds,
        title: `Journey-Abbruch: ${fullName}`,
        body: `${fullName} (${email}) hat den ${productLabel}-Rechner auf ${page || 'der Website'} verlassen ohne abzuschliessen.`,
        targetId: targetId
      }]
    };

    const notifResp = await fetch(
      `${auth.instanceUrl}/services/data/v62.0/actions/standard/customNotificationAction`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(notifPayload)
      }
    );
    const notifResult = await notifResp.json();

    if (notifResp.ok) {
      console.log(`[Notify] Custom Notification sent for ${email} → ${recipientIds.length} admins`);
      res.json({
        success: true,
        message: `Notification sent for ${fullName} (${email})`,
        recipientCount: recipientIds.length,
        targetId
      });
    } else {
      console.error('[Notify] Custom Notification error:', notifResult);
      res.status(notifResp.status || 500).json({
        error: 'Failed to send notification',
        details: notifResult
      });
    }

  } catch (err) {
    console.error('[Notify] Error:', err.message);
    res.status(500).json({ error: 'Notification failed', message: err.message });
  }
});

// Fallback to index.html for clean URLs
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Mobiliar Demo running on port ${PORT}`);
});
