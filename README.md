const state = {
  authToken: localStorage.getItem('crmAuthToken') || '',
  currentUser: null,
  dashboard: null,
  clients: [],
  vendors: [],
  inventory: [],
  sales: [],
  purchases: [],
  invoices: [],
  payments: [],
  xmlDocs: [],
  accounts: [],
  journal: [],
  quotes: []
};

const sections = {
  dashboard: document.getElementById('dashboard'),
  clients: document.getElementById('clients'),
  vendors: document.getElementById('vendors'),
  inventory: document.getElementById('inventory'),
  sales: document.getElementById('sales'),
  purchases: document.getElementById('purchases'),
  invoices: document.getElementById('invoices'),
  payments: document.getElementById('payments'),
  xml: document.getElementById('xml'),
  quotes: document.getElementById('quotes'),
  contabilidad: document.getElementById('contabilidad')
};

const authScreen = document.getElementById('authScreen');
const appShell = document.getElementById('appShell');

function setAuthVisible(visible) {
  authScreen.classList.toggle('hidden', !visible);
  appShell.classList.toggle('hidden', visible);
}

async function apiFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.authToken) {
    headers.Authorization = `Bearer ${state.authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    localStorage.removeItem('crmAuthToken');
    state.authToken = '';
    state.currentUser = null;
    setAuthVisible(true);
    throw new Error('Sesión expirada');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'No se pudo completar la operación');
  }

  return response.json();
}

function showSection(name) {
  Object.entries(sections).forEach(([key, section]) => {
    section.classList.toggle('active', key === name);
  });

  document.querySelectorAll('.nav-link').forEach((button) => {
    button.classList.toggle('active', button.dataset.section === name);
  });
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(Number(value || 0));
}

function renderDashboard(stats) {
  const cards = [
    { label: 'Clientes', value: stats.totalClients },
    { label: 'Proveedores', value: stats.totalVendors },
    { label: 'Inventario', value: formatMoney(stats.inventoryValue) },
    { label: 'Ventas', value: formatMoney(stats.totalSales) },
    { label: 'Compras', value: formatMoney(stats.totalPurchases) },
    { label: 'Facturas pendientes', value: stats.pendingInvoices },
    { label: 'XML importados', value: stats.xmlImported },
    { label: 'Cuentas', value: stats.totalAccounts },
    { label: 'Cotizaciones', value: stats.totalQuotes }
  ];

  const container = document.getElementById('dashboardStats');
  container.innerHTML = cards.map((card) => `
    <div class="stat-card">
      <h4>${card.label}</h4>
      <p class="stat-value">${card.value}</p>
    </div>
  `).join('');

  const clients = state.clients.slice(0, 4);
  const lowStock = state.inventory.filter((item) => Number(item.stock) <= Number(item.reorder_level)).slice(0, 4);

  document.getElementById('recentClients').innerHTML = clients.length
    ? clients.map((client) => `
        <div class="list-item">
          <strong>${client.name}</strong><br />
          <small>${client.company || 'Sin empresa'}</small>
        </div>
      `).join('')
    : '<p>No hay clientes recientes.</p>';

  document.getElementById('lowStockItems').innerHTML = lowStock.length
    ? lowStock.map((item) => `
        <div class="list-item">
          <strong>${item.product_name}</strong><br />
          <small>Stock: ${item.stock} / Reorden: ${item.reorder_level}</small>
        </div>
      `).join('')
    : '<p>Sin productos en riesgo.</p>';
}

function renderTable(targetId, rows, columns, mapper) {
  const table = document.getElementById(targetId);

  if (!rows.length) {
    table.innerHTML = '<div style="padding:16px;">Sin registros.</div>';
    return;
  }

  const header = columns.map((col) => `<th>${col.label}</th>`).join('');
  const body = rows.map((row) => mapper(row)).join('');
  table.innerHTML = `<thead><tr>${header}</tr></thead><tbody>${body}</tbody>`;
}

function renderClients() {
  renderTable('clientsTable', state.clients, [
    { label: 'Nombre' },
    { label: 'Empresa' },
    { label: 'Email' },
    { label: 'Teléfono' },
    { label: 'Estado' }
  ], (client) => `
    <tr>
      <td>${client.name}</td>
      <td>${client.company || '-'}</td>
      <td>${client.email || '-'}</td>
      <td>${client.phone || '-'}</td>
      <td><span class="badge-pill ${client.status === 'activo' ? 'success' : client.status === 'potencial' ? 'warning' : 'danger'}">${client.status}</span></td>
    </tr>
  `);
}

function renderVendors() {
  renderTable('vendorsTable', state.vendors, [
    { label: 'Nombre' },
    { label: 'Empresa' },
    { label: 'Email' },
    { label: 'Teléfono' },
    { label: 'Estado' }
  ], (vendor) => `
    <tr>
      <td>${vendor.name}</td>
      <td>${vendor.company || '-'}</td>
      <td>${vendor.email || '-'}</td>
      <td>${vendor.phone || '-'}</td>
      <td><span class="badge-pill ${vendor.status === 'activo' ? 'success' : 'danger'}">${vendor.status}</span></td>
    </tr>
  `);
}

function renderInventory() {
  renderTable('inventoryTable', state.inventory, [
    { label: 'Producto' },
    { label: 'SKU' },
    { label: 'Categoría' },
    { label: 'Stock' },
    { label: 'Precio' },
    { label: 'Estado' }
  ], (item) => `
    <tr>
      <td>${item.product_name}</td>
      <td>${item.sku || '-'}</td>
      <td>${item.category || '-'}</td>
      <td>${item.stock}</td>
      <td>${formatMoney(item.unit_price)}</td>
      <td><span class="badge-pill ${Number(item.stock) <= Number(item.reorder_level) ? 'warning' : 'success'}">${item.status}</span></td>
    </tr>
  `);
}

function renderSales() {
  renderTable('salesTable', state.sales, [
    { label: 'Cliente' },
    { label: 'Producto' },
    { label: 'Cantidad' },
    { label: 'Total' },
    { label: 'Fecha' },
    { label: 'Estatus' }
  ], (sale) => `
    <tr>
      <td>${sale.client_name}</td>
      <td>${sale.product_name}</td>
      <td>${sale.quantity}</td>
      <td>${formatMoney(sale.total)}</td>
      <td>${sale.sale_date}</td>
      <td><span class="badge-pill ${sale.status === 'pagado' ? 'success' : 'warning'}">${sale.status}</span></td>
    </tr>
  `);
}

function renderPurchases() {
  renderTable('purchasesTable', state.purchases, [
    { label: 'Proveedor' },
    { label: 'Producto' },
    { label: 'Cantidad' },
    { label: 'Total' },
    { label: 'Fecha' },
    { label: 'Estatus' }
  ], (purchase) => `
    <tr>
      <td>${purchase.vendor_name}</td>
      <td>${purchase.product_name}</td>
      <td>${purchase.quantity}</td>
      <td>${formatMoney(purchase.total)}</td>
      <td>${purchase.purchase_date}</td>
      <td><span class="badge-pill ${purchase.status === 'recibido' ? 'success' : 'warning'}">${purchase.status}</span></td>
    </tr>
  `);
}

function renderInvoices() {
  renderTable('invoicesTable', state.invoices, [
    { label: 'Cliente' },
    { label: 'Factura' },
    { label: 'Subtotal' },
    { label: 'Total' },
    { label: 'Vencimiento' },
    { label: 'Estado' }
  ], (invoice) => `
    <tr>
      <td>${invoice.client_name}</td>
      <td>${invoice.invoice_number}</td>
      <td>${formatMoney(invoice.subtotal)}</td>
      <td>${formatMoney(invoice.total)}</td>
      <td>${invoice.due_date || '-'}</td>
      <td><span class="badge-pill ${invoice.status === 'pagado' ? 'success' : 'warning'}">${invoice.status}</span></td>
    </tr>
  `);
}

function renderPayments() {
  renderTable('paymentsTable', state.payments, [
    { label: 'Cliente' },
    { label: 'Factura' },
    { label: 'Monto' },
    { label: 'Método' },
    { label: 'Fecha' },
    { label: 'Estatus' }
  ], (payment) => `
    <tr>
      <td>${payment.client_name}</td>
      <td>${payment.invoice_number || '-'}</td>
      <td>${formatMoney(payment.amount)}</td>
      <td>${payment.method}</td>
      <td>${payment.payment_date}</td>
      <td><span class="badge-pill ${payment.status === 'recibido' ? 'success' : 'warning'}">${payment.status}</span></td>
    </tr>
  `);
}

function renderXmlInvoices() {
  renderTable('xmlTable', state.xmlDocs, [
    { label: 'Archivo' },
    { label: 'UUID' },
    { label: 'RFC Emisor' },
    { label: 'Total' },
    { label: 'Fecha' },
    { label: 'Status' }
  ], (item) => `
    <tr>
      <td>${item.file_name}</td>
      <td>${item.uuid || '-'}</td>
      <td>${item.rfc_emisor || '-'}</td>
      <td>${formatMoney(item.total)}</td>
      <td>${item.fecha || '-'}</td>
      <td><span class="badge-pill success">${item.status || 'importado'}</span></td>
    </tr>
  `);
}

function renderQuotes() {
  renderTable('quotesTable', state.quotes, [
    { label: 'Cotización' },
    { label: 'Cliente' },
    { label: 'Total' },
    { label: 'Expira' },
    { label: 'Estado' }
  ], (quote) => `
    <tr>
      <td>${quote.quote_number}</td>
      <td>${quote.client_name}</td>
      <td>${formatMoney(quote.total)}</td>
      <td>${quote.expires_at || '-'}</td>
      <td><span class="badge-pill ${quote.status === 'aprobada' ? 'success' : quote.status === 'cancelada' ? 'danger' : 'warning'}">${quote.status}</span></td>
    </tr>
  `);
}

function renderAccounts() {
  renderTable('accountsTable', state.accounts, [
    { label: 'Código' },
    { label: 'Nombre' },
    { label: 'Tipo' },
    { label: 'Saldo' }
  ], (account) => `
    <tr>
      <td>${account.code}</td>
      <td>${account.name}</td>
      <td>${account.type}</td>
      <td>${formatMoney(account.balance)}</td>
    </tr>
  `);
}

function renderJournalEntries() {
  renderTable('journalTable', state.journal, [
    { label: 'Referencia' },
    { label: 'Descripción' },
    { label: 'Fecha' },
    { label: 'Debe' },
    { label: 'Haber' }
  ], (entry) => `
    <tr>
      <td>${entry.reference}</td>
      <td>${entry.description}</td>
      <td>${entry.entry_date}</td>
      <td>${formatMoney(entry.total_debit)}</td>
      <td>${formatMoney(entry.total_credit)}</td>
    </tr>
  `);
}

function populateSelect(selectId, items, labelKey, valueKey) {
  const select = document.getElementById(selectId);
  if (!select) return;
  if (!items.length) {
    select.innerHTML = '<option value="">Sin registros</option>';
    return;
  }
  select.innerHTML = items.map((item) => `<option value="${item[valueKey]}">${item[labelKey]}</option>`).join('');
}

function bindForm(id, onSubmit) {
  const form = document.getElementById(id);
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      await onSubmit(payload);
      form.reset();
      await loadAll();
    } catch (error) {
      alert(error.message);
    }
  });
}

async function loadAll() {
  if (!state.authToken) {
    setAuthVisible(true);
    return;
  }

  const [dashboard, clients, vendors, inventory, sales, purchases, invoices, payments, xmlDocs, accounts, journal, quotes] = await Promise.all([
    apiFetch('/api/dashboard'),
    apiFetch('/api/clients'),
    apiFetch('/api/vendors'),
    apiFetch('/api/inventory'),
    apiFetch('/api/sales'),
    apiFetch('/api/purchases'),
    apiFetch('/api/invoices'),
    apiFetch('/api/payments'),
    apiFetch('/api/xml'),
    apiFetch('/api/accounts'),
    apiFetch('/api/journal'),
    apiFetch('/api/quotes')
  ]);

  state.dashboard = dashboard;
  state.clients = clients;
  state.vendors = vendors;
  state.inventory = inventory;
  state.sales = sales;
  state.purchases = purchases;
  state.invoices = invoices;
  state.payments = payments;
  state.xmlDocs = xmlDocs;
  state.accounts = accounts;
  state.journal = journal;
  state.quotes = quotes;

  renderDashboard(dashboard.stats);
  renderClients();
  renderVendors();
  renderInventory();
  renderSales();
  renderPurchases();
  renderInvoices();
  renderPayments();
  renderXmlInvoices();
  renderQuotes();
  renderAccounts();
  renderJournalEntries();

  populateSelect('saleClientSelect', state.clients, 'name', 'id');
  populateSelect('saleProductSelect', state.inventory, 'product_name', 'id');
  populateSelect('purchaseVendorSelect', state.vendors, 'name', 'id');
  populateSelect('purchaseProductSelect', state.inventory, 'product_name', 'id');
  populateSelect('invoiceClientSelect', state.clients, 'name', 'id');
  populateSelect('paymentClientSelect', state.clients, 'name', 'id');
  populateSelect('paymentInvoiceSelect', state.invoices, 'invoice_number', 'id');
  populateSelect('quoteClientSelect', state.clients, 'name', 'id');
  populateSelect('debitAccountSelect', state.accounts, 'name', 'id');
  populateSelect('creditAccountSelect', state.accounts, 'name', 'id');
}

bindForm('clientForm', async (payload) => {
  await apiFetch('/api/clients', { method: 'POST', body: JSON.stringify(payload) });
});

bindForm('vendorForm', async (payload) => {
  await apiFetch('/api/vendors', { method: 'POST', body: JSON.stringify(payload) });
});

bindForm('inventoryForm', async (payload) => {
  await apiFetch('/api/inventory', { method: 'POST', body: JSON.stringify(payload) });
});

bindForm('saleForm', async (payload) => {
  await apiFetch('/api/sales', { method: 'POST', body: JSON.stringify(payload) });
});

bindForm('purchaseForm', async (payload) => {
  await apiFetch('/api/purchases', { method: 'POST', body: JSON.stringify(payload) });
});

bindForm('invoiceForm', async (payload) => {
  await apiFetch('/api/invoices', { method: 'POST', body: JSON.stringify(payload) });
});

bindForm('paymentForm', async (payload) => {
  await apiFetch('/api/payments', { method: 'POST', body: JSON.stringify(payload) });
});

bindForm('accountForm', async (payload) => {
  await apiFetch('/api/accounts', { method: 'POST', body: JSON.stringify(payload) });
});

bindForm('journalForm', async (payload) => {
  await apiFetch('/api/journal', { method: 'POST', body: JSON.stringify(payload) });
});

bindForm('quoteForm', async (payload) => {
  const items = [{
    product_name: payload.product_name,
    quantity: Number(payload.quantity || 1),
    unit_price: Number(payload.unit_price || 0)
  }];

  await apiFetch('/api/quotes', {
    method: 'POST',
    body: JSON.stringify({ ...payload, items })
  });
});

document.querySelectorAll('.nav-link').forEach((button) => {
  button.addEventListener('click', () => showSection(button.dataset.section));
});

document.querySelectorAll('[data-toggle-form]').forEach((button) => {
  button.addEventListener('click', () => {
    const form = document.getElementById(button.dataset.toggleForm);
    if (form) form.classList.toggle('hidden');
  });
});

const loginForm = document.getElementById('loginForm');
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(loginForm).entries());

  try {
    const result = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Credenciales inválidas');
      return data;
    });

    state.authToken = result.token;
    state.currentUser = result.user;
    localStorage.setItem('crmAuthToken', result.token);
    document.getElementById('userLabel').textContent = `Usuario: ${result.user.username} (${result.user.role})`;
    setAuthVisible(false);
    await loadAll();
    showSection('dashboard');
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  state.authToken = '';
  state.currentUser = null;
  localStorage.removeItem('crmAuthToken');
  setAuthVisible(true);
});

async function importXmlFiles() {
  const fileInput = document.getElementById('xmlInput');
  const files = Array.from(fileInput.files || []);

  if (!files.length) {
    alert('Selecciona al menos un archivo XML.');
    return;
  }

  const xmls = await Promise.all(files.map(async (file) => ({
    file_name: file.name,
    xml_text: await file.text()
  })));

  await apiFetch('/api/xml/import-massive', {
    method: 'POST',
    body: JSON.stringify({ xmls })
  });

  fileInput.value = '';
  await loadAll();
  alert('XML importados correctamente');
}

document.getElementById('importXmlBtn').addEventListener('click', importXmlFiles);

(async function init() {
  if (state.authToken) {
    try {
      const me = await apiFetch('/api/me');
      state.currentUser = me.user;
      document.getElementById('userLabel').textContent = `Usuario: ${me.user.username} (${me.user.role})`;
      setAuthVisible(false);
      await loadAll();
      showSection('dashboard');
    } catch (error) {
      console.warn(error.message);
      setAuthVisible(true);
    }
  } else {
    setAuthVisible(true);
  }
})();
