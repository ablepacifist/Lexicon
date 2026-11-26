import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Dialog from '../components/Dialog';
import { UserContext } from '../context/UserContext';
import { authFetch } from '../utils/session';
import { getApiUrls } from '../utils/apiUrls';
import { hasPermission } from '../utils/sessionUser';
import './PageStyles.css';
import './AdminUsers.css';

const { lexiconApiUrl: API } = getApiUrls();
export const PERMISSION_MANAGE_USERS = 'MANAGE_USERS';

/**
 * Admin page: accounts by when they were last used, and uploads by date and size, with
 * delete-account, delete-upload and set-password actions.
 *
 * Display only. Lexicon's UserAdminManager decides everything: sort order, every label
 * ("6 months ago", "3.0 GB"), the warning level, which rows can be deleted, and whether a
 * typed confirmation matches. This page sends what was asked for and shows the answer.
 */
export default function AdminUsers() {
  const { user } = useContext(UserContext);
  const [tab, setTab] = useState('accounts');
  const [userSort, setUserSort] = useState('');
  const [uploadSort, setUploadSort] = useState('');
  const [ownerFilter, setOwnerFilter] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [uploads, setUploads] = useState(null);
  const [storage, setStorage] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [dialog, setDialog] = useState(null); // { type, row }
  // Display only: the server refuses these calls without the permission anyway; this just
  // avoids asking for data a non-admin will never be shown.
  const isAdmin = hasPermission(user, PERMISSION_MANAGE_USERS);

  const loadAccounts = useCallback(async () => {
    const res = await authFetch(`${API}/api/admin/users${userSort ? `?sort=${encodeURIComponent(userSort)}` : ''}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.message || `Could not load accounts (HTTP ${res.status}).`); return; }
    setAccounts(data);
  }, [userSort]);

  const loadUploads = useCallback(async () => {
    const params = new URLSearchParams();
    if (uploadSort) params.set('sort', uploadSort);
    if (ownerFilter != null) params.set('ownerId', String(ownerFilter));
    const query = params.toString();
    const res = await authFetch(`${API}/api/admin/users/uploads${query ? `?${query}` : ''}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.message || `Could not load uploads (HTTP ${res.status}).`); return; }
    setUploads(data);
  }, [uploadSort, ownerFilter]);

  useEffect(() => { if (isAdmin && tab === 'accounts') loadAccounts(); }, [isAdmin, tab, loadAccounts]);
  useEffect(() => { if (isAdmin && tab === 'uploads') loadUploads(); }, [isAdmin, tab, loadUploads]);

  const loadStorage = useCallback(async () => {
    setStorage({ scanning: true });
    const res = await authFetch(`${API}/api/admin/users/storage-check`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setStorage(null); setError(data.message || `The storage check failed (HTTP ${res.status}).`); return; }
    setStorage(data);
  }, []);
  useEffect(() => { if (isAdmin && tab === 'storage') loadStorage(); }, [isAdmin, tab, loadStorage]);

  const act = async (url, method, body) => {
    setError(null);
    setNotice(null);
    const res = await authFetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: data.message || `That didn't work (HTTP ${res.status}).` };
    setDialog(null);
    setNotice(data.message || 'Done.');
    if (tab === 'accounts') loadAccounts(); else if (tab === 'uploads') loadUploads(); else loadStorage();
    return { ok: true };
  };

  const showUploadsOf = (row) => {
    setOwnerFilter(row.id);
    setTab('uploads');
  };

  if (!isAdmin) {
    return (
      <>
        <Navbar />
        <main className="admin-users">
          <div className="lx-state">
            <h1>Admins only</h1>
            <p>This page manages other players' accounts and uploads.</p>
            <div className="lx-state__actions"><Link className="lx-btn lx-btn--secondary" to="/app-selector">Back to apps</Link></div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="admin-users">
        <header className="admin-users__header">
          <h1>Users &amp; storage</h1>
          <p>Find accounts nobody uses any more and the uploads taking up space.</p>
        </header>

        <div className="admin-users__tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'accounts'}
                  className={tab === 'accounts' ? 'active' : ''} onClick={() => setTab('accounts')}>Accounts</button>
          <button type="button" role="tab" aria-selected={tab === 'uploads'}
                  className={tab === 'uploads' ? 'active' : ''} onClick={() => setTab('uploads')}>Uploads</button>
          <button type="button" role="tab" aria-selected={tab === 'storage'}
                  className={tab === 'storage' ? 'active' : ''} onClick={() => setTab('storage')}>Storage check</button>
        </div>

        {error && <div className="lx-alert lx-alert--error" role="alert">{error}</div>}
        {notice && <div className="lx-alert lx-alert--success" role="status">{notice}</div>}

        {tab === 'accounts' && (
          <AccountsTab
            data={accounts}
            onSort={setUserSort}
            onUploads={showUploadsOf}
            onDelete={(row) => setDialog({ type: 'deleteUser', row })}
            onPassword={(row) => setDialog({ type: 'password', row })}
          />
        )}
        {tab === 'uploads' && (
          <UploadsTab
            data={uploads}
            onSort={setUploadSort}
            onClearOwner={() => setOwnerFilter(null)}
            onDelete={(row) => setDialog({ type: 'deleteUpload', row })}
          />
        )}

        {tab === 'storage' && (
          <StorageTab
            data={storage}
            onRescan={loadStorage}
            onClean={() => setDialog({ type: 'clean', row: storage })}
          />
        )}

        {dialog?.type === 'clean' && (
          <CleanStorageDialog
            report={dialog.row}
            onClose={() => setDialog(null)}
            onConfirm={() => act(`${API}/api/admin/users/storage-check/clean`, 'POST',
              { paths: dialog.row.orphans.map((o) => o.path) })}
          />
        )}
        {dialog?.type === 'deleteUser' && (
          <DeleteAccountDialog
            row={dialog.row}
            onClose={() => setDialog(null)}
            onConfirm={(typed) => act(`${API}/api/admin/users/${dialog.row.id}`, 'DELETE', { confirmUsername: typed })}
          />
        )}
        {dialog?.type === 'password' && (
          <PasswordDialog
            row={dialog.row}
            onClose={() => setDialog(null)}
            onConfirm={(password) => act(`${API}/api/admin/users/${dialog.row.id}/password`, 'PUT', { password })}
          />
        )}
        {dialog?.type === 'deleteUpload' && (
          <DeleteUploadDialog
            row={dialog.row}
            onClose={() => setDialog(null)}
            onConfirm={() => act(`${API}/api/admin/users/uploads/${dialog.row.kind}/${dialog.row.id}`, 'DELETE')}
          />
        )}
      </main>
    </>
  );
}

function SortPicker({ id, sorts, value, onChange }) {
  if (!sorts) return null;
  return (
    <div className="lx-field admin-users__sort">
      <label htmlFor={id}>Sort</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {sorts.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
    </div>
  );
}

function AccountsTab({ data, onSort, onUploads, onDelete, onPassword }) {
  if (!data) return <div className="lx-state"><div className="lx-spinner" aria-label="Loading" /></div>;
  const { totals } = data;
  return (
    <section>
      <div className="admin-users__summary">
        <span><strong>{totals.accounts}</strong> accounts</span>
        <span>{totals.inactiveLabel}</span>
        <span><strong>{totals.storage}</strong> uploaded in total</span>
        <SortPicker id="user-sort" sorts={data.sorts} value={data.sort} onChange={onSort} />
      </div>
      <div className="admin-users__table-wrap">
        <table className="admin-users__table">
          <thead>
            <tr>
              <th>Account</th><th>Last used</th><th>Last password sign-in</th><th>Joined</th>
              <th>Uploads</th><th>Storage</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((row) => (
              <tr key={row.id} className={`level-${row.inactiveLevel}`}>
                <td>
                  <span className="admin-users__name">{row.username}</span>
                  {row.role === 'ADMIN' && <span className="admin-users__tag">admin</span>}
                  {row.isYou && <span className="admin-users__tag">you</span>}
                </td>
                <td><span className="admin-users__ago">{row.lastSeenAgo}</span><span className="admin-users__date">{row.lastSeen}</span></td>
                <td>{row.lastLogin}</td>
                <td>{row.registered}</td>
                <td>{row.uploadCount}</td>
                <td>{row.storage}</td>
                <td className="admin-users__actions">
                  <button type="button" className="lx-btn lx-btn--secondary" onClick={() => onUploads(row)}>Uploads</button>
                  <button type="button" className="lx-btn lx-btn--secondary" onClick={() => onPassword(row)}>Set password</button>
                  <button type="button" className="lx-btn lx-btn--danger" onClick={() => onDelete(row)}
                          disabled={!row.canDelete} title={row.deleteBlockedReason || undefined}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UploadsTab({ data, onSort, onClearOwner, onDelete }) {
  if (!data) return <div className="lx-state"><div className="lx-spinner" aria-label="Loading" /></div>;
  const { totals } = data;
  return (
    <section>
      <div className="admin-users__summary">
        <span><strong>{totals.count}</strong> uploads, <strong>{totals.storage}</strong></span>
        {totals.orphansLabel && <span className="admin-users__warn">{totals.orphansLabel}</span>}
        {data.ownerName && (
          <span className="admin-users__filter">
            Only {data.ownerName}'s uploads
            <button type="button" className="lx-btn lx-btn--secondary" onClick={onClearOwner}>Show everyone's</button>
          </span>
        )}
        <SortPicker id="upload-sort" sorts={data.sorts} value={data.sort} onChange={onSort} />
      </div>
      {data.uploads.length === 0 ? (
        <p className="admin-users__empty">No uploads.</p>
      ) : (
        <div className="admin-users__table-wrap">
          <table className="admin-users__table">
            <thead>
              <tr><th>Upload</th><th>Type</th><th>Owner</th><th>Uploaded</th><th>Size</th><th>Visibility</th>
                <th>Actions</th></tr>
            </thead>
            <tbody>
              {data.uploads.map((row) => (
                <tr key={`${row.kind}-${row.id}`} className={row.ownerMissing ? 'level-danger' : ''}>
                  <td className="admin-users__title">{row.title}</td>
                  <td>{row.type}</td>
                  <td>{row.owner}</td>
                  <td><span className="admin-users__ago">{row.uploadedAgo}</span><span className="admin-users__date">{row.uploaded}</span></td>
                  <td>{row.size}</td>
                  <td>{row.visibility}</td>
                  <td className="admin-users__actions">
                    <button type="button" className="lx-btn lx-btn--danger" onClick={() => onDelete(row)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StorageTab({ data, onRescan, onClean }) {
  if (!data || data.scanning) {
    return (
      <div className="lx-state">
        <div className="lx-spinner" aria-label="Checking the drive" />
        <p>Comparing every file on the storage drive with the database…</p>
      </div>
    );
  }
  return (
    <section>
      <div className="admin-users__summary">
        <span><strong>{data.summary}</strong></span>
        <span>Checked {data.scannedFiles} files ({data.scannedSize}) in {data.checkedFolders.join(', ')} against {data.referencedRows} uploads.</span>
        <button type="button" className="lx-btn lx-btn--secondary" onClick={onRescan}>Check again</button>
      </div>
      <p className="admin-users__note">
        Not checked: {data.skippedFolders.join(', ')}.
        {data.recentSkipped > 0 && ` ${data.recentSkipped} file(s) changed in the last day are left alone, in case an upload is still finishing.`}
      </p>
      {data.cleanBlockedReason && <div className="lx-alert lx-alert--error" role="alert">{data.cleanBlockedReason}</div>}

      {data.orphans.length > 0 && (
        <>
          <div className="admin-users__clean">
            <h2>On the drive, in no upload</h2>
            <button type="button" className="lx-btn lx-btn--danger" onClick={onClean} disabled={!data.canClean}>
              Delete {data.orphanCount} file(s) ({data.orphanSize})
            </button>
          </div>
          <div className="admin-users__table-wrap">
            <table className="admin-users__table">
              <thead><tr><th>File</th><th>Size</th><th>Last changed</th></tr></thead>
              <tbody>
                {data.orphans.map((o) => (
                  <tr key={o.path}><td className="admin-users__title">{o.path}</td><td>{o.size}</td><td>{o.modified}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data.missing.length > 0 && (
        <>
          <h2 className="admin-users__subhead">Uploads whose file is missing</h2>
          <div className="admin-users__table-wrap">
            <table className="admin-users__table">
              <thead><tr><th>Upload</th><th>Expected at</th></tr></thead>
              <tbody>
                {data.missing.map((m) => (
                  <tr key={m.id} className="level-danger"><td>{m.title}</td><td className="admin-users__title">{m.path}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function CleanStorageDialog({ report, onClose, onConfirm }) {
  const { busy, message, submit } = useSubmit(onConfirm);
  return (
    <Dialog
      title={`Delete ${report.orphanCount} unused file(s)?`}
      onClose={onClose}
      size="sm"
      actions={(
        <>
          <button type="button" className="lx-btn lx-btn--secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="lx-btn lx-btn--danger" onClick={() => submit()} disabled={busy}>
            {busy ? 'Deleting…' : `Delete (${report.orphanSize})`}
          </button>
        </>
      )}
    >
      <p>
        These files are on the drive but no upload or chat image points at them. They are removed for good.
        The server checks each one again first and keeps any that are now in use.
      </p>
      {message && <div className="lx-alert lx-alert--error" role="alert">{message}</div>}
    </Dialog>
  );
}

function useSubmit(onConfirm) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const submit = async (...args) => {
    setBusy(true);
    setMessage(null);
    const result = await onConfirm(...args);
    setBusy(false);
    if (result && !result.ok) setMessage(result.message);
  };
  return { busy, message, submit };
}

function DeleteAccountDialog({ row, onClose, onConfirm }) {
  const [typed, setTyped] = useState('');
  const { busy, message, submit } = useSubmit(onConfirm);
  return (
    <Dialog
      title={`Delete ${row.username}?`}
      onClose={onClose}
      actions={(
        <>
          <button type="button" className="lx-btn lx-btn--secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="lx-btn lx-btn--danger" onClick={() => submit(typed)} disabled={busy || !typed}>
            {busy ? 'Deleting…' : 'Delete account and uploads'}
          </button>
        </>
      )}
    >
      <p>
        This removes the account and everything it uploaded: <strong>{row.uploadCount}</strong> upload(s),
        {' '}<strong>{row.storage}</strong>, plus its playlists and sign-ins. It can't be undone.
      </p>
      <div className="lx-field">
        <label htmlFor="confirm-username">Type <strong>{row.username}</strong> to confirm</label>
        <input id="confirm-username" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </div>
      {message && <div className="lx-alert lx-alert--error" role="alert">{message}</div>}
    </Dialog>
  );
}

function PasswordDialog({ row, onClose, onConfirm }) {
  const [password, setPassword] = useState('');
  const { busy, message, submit } = useSubmit(onConfirm);
  return (
    <Dialog
      title={`New password for ${row.username}`}
      onClose={onClose}
      size="sm"
      actions={(
        <>
          <button type="button" className="lx-btn lx-btn--secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="lx-btn lx-btn--primary" onClick={() => submit(password)} disabled={busy || !password}>
            {busy ? 'Saving…' : 'Set password'}
          </button>
        </>
      )}
    >
      <p>Pass this password on to them so they can sign in again. Anywhere they are still signed in is signed out.</p>
      <div className="lx-field">
        <label htmlFor="new-password">New password</label>
        <input id="new-password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
      </div>
      {message && <div className="lx-alert lx-alert--error" role="alert">{message}</div>}
    </Dialog>
  );
}

function DeleteUploadDialog({ row, onClose, onConfirm }) {
  const { busy, message, submit } = useSubmit(onConfirm);
  return (
    <Dialog
      title="Delete this upload?"
      onClose={onClose}
      size="sm"
      actions={(
        <>
          <button type="button" className="lx-btn lx-btn--secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="lx-btn lx-btn--danger" onClick={() => submit()} disabled={busy}>
            {busy ? 'Deleting…' : `Delete (${row.size})`}
          </button>
        </>
      )}
    >
      <p><strong>{row.title}</strong> ({row.type}, {row.owner}) is removed from disk and from every playlist. It can't be undone.</p>
      {message && <div className="lx-alert lx-alert--error" role="alert">{message}</div>}
    </Dialog>
  );
}
