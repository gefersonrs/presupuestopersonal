require('dotenv').config();
const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Initialize Google Sheets document
const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID);

// Initialize auth
const initializeAuth = async () => {
  try {
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
    await doc.loadInfo();
  } catch (error) {
    console.error('Error initializing auth:', error);
  }
};

initializeAuth();

// Get purchases sheet
const getPurchasesSheet = async () => {
  const sheet = doc.sheetsByTitle['Purchases'];
  if (!sheet) {
    // Create sheet if it doesn't exist
    return await doc.addSheet({ title: 'Purchases', headerValues: ['id', 'date', 'description', 'amount', 'category'] });
  }
  return sheet;
};

// API Routes
app.get('/api/purchases', async (req, res) => {
  try {
    const sheet = await getPurchasesSheet();
    const rows = await sheet.getRows();
    const purchases = rows.map(row => ({
      id: row.id,
      date: row.date,
      description: row.description,
      amount: parseFloat(row.amount),
      category: row.category
    }));
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/purchases', async (req, res) => {
  try {
    const { date, description, amount, category } = req.body;
    const sheet = await getPurchasesSheet();
    const id = Date.now().toString();
    await sheet.addRow({ id, date, description, amount, category });
    res.json({ id, date, description, amount, category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/purchases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, description, amount, category } = req.body;
    const sheet = await getPurchasesSheet();
    const rows = await sheet.getRows();
    const row = rows.find(row => row.id === id);
    if (row) {
      row.date = date;
      row.description = description;
      row.amount = amount;
      row.category = category;
      await row.save();
      res.json({ id, date, description, amount, category });
    } else {
      res.status(404).json({ error: 'Purchase not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/purchases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sheet = await getPurchasesSheet();
    const rows = await sheet.getRows();
    const row = rows.find(row => row.id === id);
    if (row) {
      await row.delete();
      res.json({ message: 'Purchase deleted' });
    } else {
      res.status(404).json({ error: 'Purchase not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
