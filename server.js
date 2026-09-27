const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'crm.db'));

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function normalizeXml(xml) {
  return String(xml || '')
    .replace(/<\/?[A-Za-z]+:/g, (match) => match.replace(/[A-Za-z]+:/, ''))
    .replace(/\r\n/g, '')
    .trim();
}

function getTagValue(xml, tagName) {
  const normalized = normalizeXml(xml);
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = normalized.match(regex);
  if (!match) return '';
  return match[1].replace(/<[^>]+>/g, '').trim();
}

function getAttributeValue(xml, tagName, attrName) {
  const normalized = normalizeXml(xml);
  const regex = new RegExp(`<${tagName}[^>]*\\s${attrName}="([^"]+)"`, 'i');
  const match = normalized.match(regex);
  return match ? match[1].trim() : '';
}

function parseXmlInvoice(xml, fileName = 'factura.xml') {
  const cleanXml = normalizeXml(xml);

  const uuid = getTagValue(cleanXml, 'UUID') || '';
  const folio = getTagValue(cleanXml, 'Folio') || '';
  const fecha = getAttributeValue(cleanXml, 'Comprobante', 'Fecha') || getTagValue(cleanXml, 'Fecha') || '';
  const subtotal = Number(getAttributeValue(cleanXml, 'Comprobante', 'SubTotal') || getTagValue(cleanXml, 'SubTotal') || 0);
  const total = Number(getAttributeValue(cleanXml, 'Comprobante', 'Total') || getTagValue(cleanXml, 'Total') || 0);

  const rfcEmisor = getAttributeValue(cleanXml, 'Emisor', 'Rfc') || getTagValue(cleanXml, 'Rfc') || '';
  const nombreEmisor = getAttributeValue(cleanXml, 'Emisor', 'Nombre') || getTagValue(cleanXml, 'Nombre') || '';
  const rfcReceptor = getAttributeValue(cleanXml, 'Receptor', 'Rfc') || '';
  const nombreReceptor = getAttributeValue(cleanXml, 'Receptor', 'Nombre') || '';

  return {
    file_name: fileName,
    uuid,
    folio,
    fecha,
    subtotal,
    total,
    rfc_emisor: rfcEmisor,
    nombre_emisor: nombreEmisor,
    rfc_receptor: rfcReceptor,
    nombre_receptor: nombreReceptor,
    xml_content: cleanXml,
    status: 'importado'
  };
}

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      address TEXT,
      status TEXT DEFAULT 'activo',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      address TEXT,
      status TEXT DEFAULT 'activo',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_name TEXT NOT NULL,
      sku TEXT,
      category TEXT,
      stock INTEGER DEFAULT 0,
      unit_price REAL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      reorder_level INTEGER DEFAULT 0,
      status TEXT DEFAULT 'activo',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      total REAL DEFAULT 0,
      status TEXT DEFAULT 'pendiente',
      sale_date TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(client_id) REFERENCES clients(id),
      FOREIGN KEY(product_id) REFERENCES inventory(id)
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      total REAL DEFAULT 0,
      status TEXT DEFAULT 'pendiente',
      purchase_date TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(vendor_id) REFERENCES vendors(id),
      FOREIGN KEY(product_id) REFERENCES inventory(id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      invoice_number TEXT NOT NULL,
      subtotal REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      total REAL DEFAULT 0,
      issued_at TEXT DEFAULT CURRENT_TIMESTAMP,
      due_date TEXT,
      status TEXT DEFAULT 'pendiente',
      FOREIGN KEY(client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      invoice_id INTEGER,
      amount REAL DEFAULT 0,
      payment_date TEXT DEFAULT CURRENT_TIMESTAMP,
      method TEXT DEFAULT 'transferencia',
      status TEXT DEFAULT 'recibido',
      FOREIGN KEY(client_id) REFERENCES clients(id),
      FOREIGN KEY(invoice_id) REFERENCES invoices(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'ventas',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS xml_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT,
      uuid TEXT,
      folio TEXT,
      fecha TEXT,
      subtotal REAL DEFAULT 0,
      total REAL DEFAULT 0,
      rfc_emisor TEXT,
      nombre_emisor TEXT,
      rfc_receptor TEXT,
      nombre_receptor TEXT,
      status TEXT DEFAULT 'importado',
      xml_content TEXT,
      imported_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      parent_id INTEGER,
      balance REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(parent_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT,
      description TEXT,
      entry_date TEXT DEFAULT CURRENT_TIMESTAMP,
      total_debit REAL DEFAULT 0,
      total_credit REAL DEFAULT 0,
      created_by TEXT DEFAULT 'admin'
    );

    CREATE TABLE IF NOT EXISTS journal_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      memo TEXT,
      FOREIGN KEY(entry_id) REFERENCES journal_entries(id),
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      quote_number TEXT NOT NULL UNIQUE,
      total REAL DEFAULT 0,
      status TEXT DEFAULT 'pendiente',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT,
      FOREIGN KEY(client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS quote_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      unit_price REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      FOREIGN KEY(quote_id) REFERENCES quotes(id)
    );
  `);

  const clientCount = db.prepare('SELECT COUNT(*) as total FROM clients').get().total;
  if (clientCount === 0) seedData();

  const userCount = db.prepare('SELECT COUNT(*) as total FROM users').get().total;
  if (userCount === 0) {
    const insertUser = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
    insertUser.run('admin', hashPassword('admin123'), 'admin');
    insertUser.run('ventas', hashPassword('ventas123'), 'ventas');
  }

  const accountCount = db.prepare('SELECT COUNT(*) as total FROM accounts').get().total;
  if (accountCount === 0) seedAccounts();
}

function seedData() {
  const insertClient = db.prepare(`INSERT INTO clients (name, email, phone, company, address, status) VALUES (?, ?, ?, ?, ?, ?)`);
  const insertVendor = db.prepare(`INSERT INTO vendors (name, email, phone, company, address, status) VALUES (?, ?, ?, ?, ?, ?)`);
  const insertProduct = db.prepare(`INSERT INTO inventory (product_name, sku, category, stock, unit_price, cost_price, reorder_level, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertSale = db.prepare(`INSERT INTO sales (client_id, product_id, quantity, total, status, sale_date) VALUES (?, ?, ?, ?, ?, ?)`);
  const insertPurchase = db.prepare(`INSERT INTO purchases (vendor_id, product_id, quantity, total, status, purchase_date) VALUES (?, ?, ?, ?, ?, ?)`);
  const insertInvoice = db.prepare(`INSERT INTO invoices (client_id, invoice_number, subtotal, tax, total, issued_at, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertPayment = db.prepare(`INSERT INTO payments (client_id, invoice_id, amount, payment_date, method, status) VALUES (?, ?, ?, ?, ?, ?)`);

  const clients = [
    ['María López', 'maria@ejemplo.com', '555-1001', 'López & Asociados', 'Guadalajara', 'activo'],
    ['Carlos Gómez', 'carlos@ejemplo.com', '555-1002', 'Gómez Distribuciones', 'Monterrey', 'activo'],
    ['Ana Ruiz', 'ana@ejemplo.com', '555-1003', 'Ruiz Retail', 'Ciudad de México', 'potencial']
  ];

  const vendors = [
    ['Distribuidora Norte', 'ventas@norte.com', '555-2001', 'Norte S.A.', 'Tijuana', 'activo'],
    ['Bodega Central', 'contacto@central.com', '555-2002', 'Central Group', 'Puebla', 'activo']
  ];

  const products = [
    ['Laptop Pro 14', 'LP-14', 'Tecnología', 18, 15000, 10500, 5, 'activo'],
    ['Impresora Laser', 'IL-220', 'Oficina', 9, 5600, 3900, 3, 'activo'],
    ['Mouse Inalámbrico', 'MI-89', 'Accesorios', 35, 420, 180, 15, 'activo']
  ];

  clients.forEach((client) => insertClient.run(...client));
  vendors.forEach((vendor) => insertVendor.run(...vendor));
  products.forEach((product) => insertProduct.run(...product));

  const createdClients = db.prepare('SELECT id FROM clients ORDER BY id').all();
  const createdVendors = db.prepare('SELECT id FROM vendors ORDER BY id').all();
  const createdProducts = db.prepare('SELECT id FROM inventory ORDER BY id').all();

  insertSale.run(createdClients[0].id, createdProducts[0].id, 2, 30000, 'pagado', '2026-09-01');
  insertSale.run(createdClients[1].id, createdProducts[2].id, 10, 4200, 'pendiente', '2026-09-10');

  insertPurchase.run(createdVendors[0].id, createdProducts[0].id, 5, 52500, 'recibido', '2026-09-04');
  insertPurchase.run(createdVendors[1].id, createdProducts[1].id, 8, 31200, 'pendiente', '2026-09-08');

  insertInvoice.run(createdClients[0].id, 'F-1001', 15000, 2400, 17400, '2026-09-03', '2026-09-20', 'pagado');
  insertInvoice.run(createdClients[1].id, 'F-1002', 5600, 896, 6496, '2026-09-14', '2026-09-30', 'pendiente');

  insertPayment.run(createdClients[0].id, 1, 17400, '2026-09-05', 'transferencia', 'recibido');
  insertPayment.run(createdClients[1].id, 2, 2500, '2026-09-16', 'efectivo', 'pendiente');
}

function seedAccounts() {
  const insertAccount = db.prepare(`INSERT INTO accounts (code, name, type, parent_id, balance) VALUES (?, ?, ?, ?, ?)`);

  const accounts = [
    ['1000', 'Caja y Bancos', 'activo', null, 0],
    ['1100', 'Clientes', 'activo', null, 0],
    ['1200', 'IVA por Cobrar', 'activo', null, 0],
    ['2000', 'Proveedores', 'pasivo', null, 0],
    ['2100', 'IVA por Pagar', 'pasivo', null, 0],
    ['3000', 'Capital Social', 'patrimonio', null, 0],
    ['4000', 'Ventas', 'ingreso', null, 0],
    ['5000', 'Compras', 'gasto', null, 0],
    ['5100', 'Gastos Administrativos', 'gasto', null, 0],
    ['6000', 'Cuentas por Cobrar', 'activo', null, 0],
    ['6100', 'Cuentas por Pagar', 'pasivo', null, 0]
  ];

  accounts.forEach((account) => insertAccount.run(...account));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(Number(value || 0));
}

function getDashboardStats() {
  const totalClients = db.prepare('SELECT COUNT(*) as total FROM clients').get().total;
  const totalVendors = db.prepare('SELECT COUNT(*) as total FROM vendors').get().total;
  const inventoryValue = db.prepare('SELECT COALESCE(SUM(stock * unit_price), 0) as total FROM inventory').get().total;
  const totalSales = db.prepare('SELECT COALESCE(SUM(total), 0) as total FROM sales').get().total;
  const totalPurchases = db.prepare('SELECT COALESCE(SUM(total), 0) as total FROM purchases').get().total;
  const pendingInvoices = db.prepare('SELECT COUNT(*) as total FROM invoices WHERE status != "pagado"').get().total;
  const lowStock = db.prepare('SELECT COUNT(*) as total FROM inventory WHERE stock <= reorder_level').get().total;
  const xmlImported = db.prepare('SELECT COUNT(*) as total FROM xml_invoices').get().total;
  const totalAccounts = db.prepare('SELECT COUNT(*) as total FROM accounts').get().total;
  const totalQuotes = db.prepare('SELECT COUNT(*) as total FROM quotes').get().total;

  return {
    totalClients,
    totalVendors,
    inventoryValue,
    totalSales,
    totalPurchases,
    pendingInvoices,
    lowStock,
    xmlImported,
    totalAccounts,
    totalQuotes
  };
}

function listClients() {
  return db.prepare('SELECT * FROM clients ORDER BY created_at DESC').all();
}

function listVendors() {
  return db.prepare('SELECT * FROM vendors ORDER BY created_at DESC').all();
}

function listInventory() {
  return db.prepare('SELECT * FROM inventory ORDER BY created_at DESC').all();
}

function listSales() {
  return db.prepare(`
    SELECT s.*, c.name as client_name, i.product_name
    FROM sales s
    LEFT JOIN clients c ON c.id = s.client_id
    LEFT JOIN inventory i ON i.id = s.product_id
    ORDER BY s.sale_date DESC
  `).all();
}

function listPurchases() {
  return db.prepare(`
    SELECT p.*, v.name as vendor_name, i.product_name
    FROM purchases p
    LEFT JOIN vendors v ON v.id = p.vendor_id
    LEFT JOIN inventory i ON i.id = p.product_id
    ORDER BY p.purchase_date DESC
  `).all();
}

function listInvoices() {
  return db.prepare(`
    SELECT inv.*, c.name as client_name
    FROM invoices inv
    LEFT JOIN clients c ON c.id = inv.client_id
    ORDER BY inv.issued_at DESC
  `).all();
}

function listPayments() {
  return db.prepare(`
    SELECT pay.*, c.name as client_name, inv.invoice_number
    FROM payments pay
    LEFT JOIN clients c ON c.id = pay.client_id
    LEFT JOIN invoices inv ON inv.id = pay.invoice_id
    ORDER BY pay.payment_date DESC
  `).all();
}

function listUsers() {
  return db.prepare('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC').all();
}

function listXmlInvoices() {
  return db.prepare('SELECT * FROM xml_invoices ORDER BY imported_at DESC').all();
}

function listAccounts() {
  return db.prepare('SELECT * FROM accounts ORDER BY code ASC').all();
}

function listJournalEntries() {
  const entries = db.prepare(`
    SELECT je.*, 
      (SELECT json_group_array(json_object(
        'id', jl.id,
        'account_id', jl.account_id,
        'account_name', a.name,
        'debit', jl.debit,
        'credit', jl.credit,
        'memo', jl.memo
      )) FROM journal_lines jl LEFT JOIN accounts a ON a.id = jl.account_id WHERE jl.entry_id = je.id) AS lines_json
    FROM journal_entries je
    ORDER BY je.entry_date DESC, je.id DESC
  `).all();

  return entries.map((entry) => ({
    ...entry,
    lines: entry.lines_json ? JSON.parse(entry.lines_json) : []
  }));
}

function listQuotes() {
  return db.prepare(`
    SELECT q.*, c.name AS client_name,
      (SELECT json_group_array(json_object(
        'id', ql.id,
        'product_name', ql.product_name,
        'quantity', ql.quantity,
        'unit_price', ql.unit_price,
        'subtotal', ql.subtotal
      )) FROM quote_lines ql WHERE ql.quote_id = q.id) AS lines_json
    FROM quotes q
    LEFT JOIN clients c ON c.id = q.client_id
    ORDER BY q.created_at DESC
  `).all().map((quote) => ({
    ...quote,
    lines: quote.lines_json ? JSON.parse(quote.lines_json) : []
  }));
}

function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(String(username).trim());
}

function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(Number(id));
}

function createUser(data) {
  const username = String(data.username || '').trim();
  const role = String(data.role || 'ventas').trim();
  const password = String(data.password || '').trim();

  if (!username || !password) {
    throw new Error('Usuario y contraseña son obligatorios');
  }

  if (getUserByUsername(username)) {
    throw new Error('El usuario ya existe');
  }

  const stmt = db.prepare(`INSERT INTO users (username, password_hash, role) VALUES (@username, @password_hash, @role)`);
  const result = stmt.run({
    username,
    password_hash: hashPassword(password),
    role
  });

  return db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
}

function validateCredentials(username, password) {
  const user = getUserByUsername(username);
  if (!user) return null;
  if (user.password_hash !== hashPassword(password)) return null;
  return { id: user.id, username: user.username, role: user.role };
}

function createClient(data) {
  const stmt = db.prepare(`INSERT INTO clients (name, email, phone, company, address, status) VALUES (@name, @email, @phone, @company, @address, @status)`);
  const result = stmt.run({
    name: data.name || 'Cliente sin nombre',
    email: data.email || '',
    phone: data.phone || '',
    company: data.company || '',
    address: data.address || '',
    status: data.status || 'activo'
  });
  return db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
}

function createVendor(data) {
  const stmt = db.prepare(`INSERT INTO vendors (name, email, phone, company, address, status) VALUES (@name, @email, @phone, @company, @address, @status)`);
  const result = stmt.run({
    name: data.name || 'Proveedor sin nombre',
    email: data.email || '',
    phone: data.phone || '',
    company: data.company || '',
    address: data.address || '',
    status: data.status || 'activo'
  });
  return db.prepare('SELECT * FROM vendors WHERE id = ?').get(result.lastInsertRowid);
}

function createInventoryItem(data) {
  const stmt = db.prepare(`INSERT INTO inventory (product_name, sku, category, stock, unit_price, cost_price, reorder_level, status) VALUES (@product_name, @sku, @category, @stock, @unit_price, @cost_price, @reorder_level, @status)`);
  const result = stmt.run({
    product_name: data.product_name || 'Producto nuevo',
    sku: data.sku || '',
    category: data.category || 'General',
    stock: Number(data.stock || 0),
    unit_price: Number(data.unit_price || 0),
    cost_price: Number(data.cost_price || 0),
    reorder_level: Number(data.reorder_level || 0),
    status: data.status || 'activo'
  });
  return db.prepare('SELECT * FROM inventory WHERE id = ?').get(result.lastInsertRowid);
}

function createSale(data) {
  const clientId = Number(data.client_id);
  const productId = Number(data.product_id);
  const quantity = Number(data.quantity || 1);
  const total = Number(data.total || 0);

  const product = db.prepare('SELECT * FROM inventory WHERE id = ?').get(productId);
  if (!product) throw new Error('Producto no encontrado');
  if ((product.stock || 0) < quantity) throw new Error('No hay suficiente stock disponible');

  db.prepare('UPDATE inventory SET stock = stock - ? WHERE id = ?').run(quantity, productId);

  const stmt = db.prepare(`INSERT INTO sales (client_id, product_id, quantity, total, status, sale_date) VALUES (@client_id, @product_id, @quantity, @total, @status, @sale_date)`);
  const result = stmt.run({
    client_id: clientId,
    product_id: productId,
    quantity,
    total,
    status: data.status || 'pendiente',
    sale_date: data.sale_date || new Date().toISOString().slice(0, 10)
  });

  return db.prepare('SELECT s.*, c.name as client_name, i.product_name FROM sales s LEFT JOIN clients c ON c.id = s.client_id LEFT JOIN inventory i ON i.id = s.product_id WHERE s.id = ?').get(result.lastInsertRowid);
}

function createPurchase(data) {
  const vendorId = Number(data.vendor_id);
  const productId = Number(data.product_id);
  const quantity = Number(data.quantity || 1);
  const total = Number(data.total || 0);

  const stmt = db.prepare(`INSERT INTO purchases (vendor_id, product_id, quantity, total, status, purchase_date) VALUES (@vendor_id, @product_id, @quantity, @total, @status, @purchase_date)`);
  const result = stmt.run({
    vendor_id: vendorId,
    product_id: productId,
    quantity,
    total,
    status: data.status || 'pendiente',
    purchase_date: data.purchase_date || new Date().toISOString().slice(0, 10)
  });

  const product = db.prepare('SELECT * FROM inventory WHERE id = ?').get(productId);
  if (product) {
    db.prepare('UPDATE inventory SET stock = stock + ? WHERE id = ?').run(quantity, productId);
  }

  return db.prepare('SELECT p.*, v.name as vendor_name, i.product_name FROM purchases p LEFT JOIN vendors v ON v.id = p.vendor_id LEFT JOIN inventory i ON i.id = p.product_id WHERE p.id = ?').get(result.lastInsertRowid);
}

function createInvoice(data) {
  const stmt = db.prepare(`INSERT INTO invoices (client_id, invoice_number, subtotal, tax, total, issued_at, due_date, status) VALUES (@client_id, @invoice_number, @subtotal, @tax, @total, @issued_at, @due_date, @status)`);
  const result = stmt.run({
    client_id: Number(data.client_id),
    invoice_number: data.invoice_number || `F-${Date.now()}`,
    subtotal: Number(data.subtotal || 0),
    tax: Number(data.tax || 0),
    total: Number(data.total || 0),
    issued_at: data.issued_at || new Date().toISOString().slice(0, 10),
    due_date: data.due_date || null,
    status: data.status || 'pendiente'
  });

  return db.prepare('SELECT * FROM invoices WHERE id = ?').get(result.lastInsertRowid);
}

function createPayment(data) {
  const stmt = db.prepare(`INSERT INTO payments (client_id, invoice_id, amount, payment_date, method, status) VALUES (@client_id, @invoice_id, @amount, @payment_date, @method, @status)`);
  const result = stmt.run({
    client_id: Number(data.client_id),
    invoice_id: data.invoice_id ? Number(data.invoice_id) : null,
    amount: Number(data.amount || 0),
    payment_date: data.payment_date || new Date().toISOString().slice(0, 10),
    method: data.method || 'transferencia',
    status: data.status || 'recibido'
  });

  return db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid);
}

function createAccount(data) {
  const code = String(data.code || '').trim();
  const name = String(data.name || '').trim();
  const type = String(data.type || 'activo').trim();
  if (!code || !name) throw new Error('Código y nombre son obligatorios');

  const stmt = db.prepare(`INSERT INTO accounts (code, name, type, parent_id, balance) VALUES (@code, @name, @type, @parent_id, @balance)`);
  const result = stmt.run({
    code,
    name,
    type,
    parent_id: data.parent_id ? Number(data.parent_id) : null,
    balance: Number(data.balance || 0)
  });

  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid);
}

function createJournalEntry(data) {
  const debitAccountId = Number(data.debit_account_id);
  const creditAccountId = Number(data.credit_account_id);
  const amount = Number(data.amount || 0);
  const description = String(data.description || '').trim();
  const entryDate = data.entry_date || new Date().toISOString().slice(0, 10);

  if (!debitAccountId || !creditAccountId || !amount || !description) {
    throw new Error('Faltan datos para crear el asiento contable');
  }

  if (debitAccountId === creditAccountId) {
    throw new Error('La cuenta deudora y acreedora no pueden ser la misma');
  }

  const stmt = db.transaction(() => {
    const reference = `AS-${Date.now()}`;
    const entry = db.prepare(`INSERT INTO journal_entries (reference, description, entry_date, total_debit, total_credit, created_by) VALUES (@reference, @description, @entry_date, @total_debit, @total_credit, @created_by)`).run({
      reference,
      description,
      entry_date: entryDate,
      total_debit: amount,
      total_credit: amount,
      created_by: data.created_by || 'admin'
    });

    const entryId = entry.lastInsertRowid;
    db.prepare(`INSERT INTO journal_lines (entry_id, account_id, debit, credit, memo) VALUES (?, ?, ?, ?, ?)`).run(entryId, debitAccountId, amount, 0, description);
    db.prepare(`INSERT INTO journal_lines (entry_id, account_id, debit, credit, memo) VALUES (?, ?, ?, ?, ?)`).run(entryId, creditAccountId, 0, amount, description);

    return db.prepare(`SELECT je.*, (SELECT json_group_array(json_object('id', jl.id, 'account_id', jl.account_id, 'debit', jl.debit, 'credit', jl.credit, 'memo', jl.memo)) FROM journal_lines jl WHERE jl.entry_id = je.id) AS lines_json FROM journal_entries je WHERE je.id = ?`).get(entryId);
  });

  const entry = stmt();
  return {
    ...entry,
    lines: entry.lines_json ? JSON.parse(entry.lines_json) : []
  };
}

function createQuote(data) {
  const clientId = Number(data.client_id);
  const quoteNumber = String(data.quote_number || `COT-${Date.now()}`).trim();
  const status = String(data.status || 'pendiente').trim();
  const expiresAt = data.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const items = Array.isArray(data.items) ? data.items : [];
  if (!clientId || !items.length) {
    throw new Error('Debe seleccionar un cliente y al menos un producto para la cotización');
  }

  const total = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);

  const stmt = db.transaction(() => {
    const quote = db.prepare(`INSERT INTO quotes (client_id, quote_number, total, status, expires_at) VALUES (@client_id, @quote_number, @total, @status, @expires_at)`).run({
      client_id: clientId,
      quote_number: quoteNumber,
      total,
      status,
      expires_at: expiresAt
    });

    const quoteId = quote.lastInsertRowid;
    const insertLine = db.prepare(`INSERT INTO quote_lines (quote_id, product_name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)`);
    items.forEach((item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unit_price || 0);
      const subtotal = quantity * unitPrice;
      insertLine.run(quoteId, item.product_name || 'Producto', quantity, unitPrice, subtotal);
    });

    return db.prepare(`SELECT q.*, c.name as client_name FROM quotes q LEFT JOIN clients c ON c.id = q.client_id WHERE q.id = ?`).get(quoteId);
  });

  return stmt();
}

function importXmlInvoices(xmls) {
  const input = Array.isArray(xmls) ? xmls : [xmls];
  const inserted = [];

  for (const item of input) {
    if (!item || !item.xml_text) continue;

    const parsed = parseXmlInvoice(item.xml_text, item.file_name || 'factura.xml');
    if (!parsed.uuid && !parsed.folio) continue;

    const existing = db.prepare('SELECT id FROM xml_invoices WHERE uuid = ? OR file_name = ?').get(parsed.uuid || '', parsed.file_name || '');
    if (existing) {
      db.prepare(`UPDATE xml_invoices SET folio = @folio, fecha = @fecha, subtotal = @subtotal, total = @total, rfc_emisor = @rfc_emisor, nombre_emisor = @nombre_emisor, rfc_receptor = @rfc_receptor, nombre_receptor = @nombre_receptor, xml_content = @xml_content, status = @status, imported_at = CURRENT_TIMESTAMP WHERE id = @id`).run({
        id: existing.id,
        folio: parsed.folio,
        fecha: parsed.fecha,
        subtotal: parsed.subtotal,
        total: parsed.total,
        rfc_emisor: parsed.rfc_emisor,
        nombre_emisor: parsed.nombre_emisor,
        rfc_receptor: parsed.rfc_receptor,
        nombre_receptor: parsed.nombre_receptor,
        xml_content: parsed.xml_content,
        status: parsed.status
      });
      inserted.push(db.prepare('SELECT * FROM xml_invoices WHERE id = ?').get(existing.id));
      continue;
    }

    const result = db.prepare(`INSERT INTO xml_invoices (file_name, uuid, folio, fecha, subtotal, total, rfc_emisor, nombre_emisor, rfc_receptor, nombre_receptor, status, xml_content) VALUES (@file_name, @uuid, @folio, @fecha, @subtotal, @total, @rfc_emisor, @nombre_emisor, @rfc_receptor, @nombre_receptor, @status, @xml_content)`).run({
      file_name: parsed.file_name,
      uuid: parsed.uuid,
      folio: parsed.folio,
      fecha: parsed.fecha,
      subtotal: parsed.subtotal,
      total: parsed.total,
      rfc_emisor: parsed.rfc_emisor,
      nombre_emisor: parsed.nombre_emisor,
      rfc_receptor: parsed.rfc_receptor,
      nombre_receptor: parsed.nombre_receptor,
      status: parsed.status,
      xml_content: parsed.xml_content
    });

    inserted.push(db.prepare('SELECT * FROM xml_invoices WHERE id = ?').get(result.lastInsertRowid));
  }

  return inserted;
}

module.exports = {
  db,
  initializeDatabase,
  formatCurrency,
  getDashboardStats,
  listClients,
  listVendors,
  listInventory,
  listSales,
  listPurchases,
  listInvoices,
  listPayments,
  listUsers,
  listXmlInvoices,
  listAccounts,
  listJournalEntries,
  listQuotes,
  getUserById,
  createUser,
  validateCredentials,
  createClient,
  createVendor,
  createInventoryItem,
  createSale,
  createPurchase,
  createInvoice,
  createPayment,
  createAccount,
  createJournalEntry,
  createQuote,
  importXmlInvoices,
  parseXmlInvoice,
  hashPassword,
  getUserByUsername
};

initializeDatabase();
