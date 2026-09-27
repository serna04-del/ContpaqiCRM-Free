* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: #f4f7fb;
  color: #1a1a1a;
}

button, input, select {
  font: inherit;
}

.hidden {
  display: none !important;
}

.auth-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #0f172a, #1e3a8a);
}

.auth-card {
  width: min(420px, 90vw);
  background: rgba(255, 255, 255, 0.96);
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.18);
}

.auth-card h1 {
  margin: 0 0 8px;
  font-size: 2rem;
  color: #111827;
}

.auth-card p {
  margin-top: 0;
  margin-bottom: 20px;
  color: #475569;
}

#loginForm {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

#loginForm label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #334155;
  font-weight: 600;
}

#loginForm input {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
}

#loginForm button,
.primary-btn,
.logout-btn {
  border: none;
  border-radius: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: 0.2s ease;
}

#loginForm button,
.primary-btn {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: white;
  font-weight: 700;
}

.credentials-note {
  margin-top: 16px;
  color: #475569;
  font-size: 0.9rem;
}

.app-shell {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 260px;
  background: #0f172a;
  color: #fff;
  padding: 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  font-weight: bold;
  font-size: 22px;
}

.brand h1 {
  margin: 0;
  font-size: 1.1rem;
}

.brand small {
  color: #94a3b8;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-link {
  border: none;
  background: transparent;
  color: #dbeafe;
  text-align: left;
  padding: 12px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: 0.2s;
}

.nav-link:hover,
.nav-link.active {
  background: #1e293b;
}

.logout-btn {
  margin-top: auto;
  background: #dc2626;
  color: white;
  font-weight: 700;
}

.main-panel {
  flex: 1;
  padding: 20px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.topbar h2 {
  margin: 0;
}

.topbar small {
  color: #64748b;
}

.badge {
  display: inline-block;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.success {
  background: #dcfce7;
  color: #166534;
}

.panel {
  display: none;
}

.panel.active {
  display: block;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card,
.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 18px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
}

.stat-card h4 {
  margin: 0 0 8px;
  color: #64748b;
  font-weight: 600;
  font-size: 0.85rem;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.data-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 18px;
}

.data-form input,
.data-form select,
.upload-zone {
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
}

.data-form button {
  border: none;
  border-radius: 8px;
  background: #0f172a;
  color: white;
  padding: 10px 14px;
  cursor: pointer;
}

.table-wrap {
  overflow-x: auto;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

th, td {
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

th {
  background: #f8fafc;
  font-size: 0.78rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #475569;
}

.badge-pill {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #e0f2fe;
  color: #075985;
}

.badge-pill.warning {
  background: #fef3c7;
  color: #92400e;
}

.badge-pill.success {
  background: #dcfce7;
  color: #166534;
}

.badge-pill.danger {
  background: #fee2e2;
  color: #991b1b;
}

.xml-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.upload-zone {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 220px;
  min-height: 52px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.upload-zone input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

@media (max-width: 860px) {
  .app-shell {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
  }

  .nav {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
