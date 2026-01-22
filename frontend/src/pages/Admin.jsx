import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api, API_URL } from '../services/api';
import { connectSocket } from '../services/socket';
import { LogOut, Check, Clock, AlertCircle } from 'lucide-react';
import { getMenuImage } from '../utils/images';

const blankItem = { name: '', description: '', price_cents: '', avg_prep_seconds: 300, image_url: '', active: true };

function MenuForm({ data, setData, onSubmit, submitLabel, onCancel, notify }) {
  const [uploading, setUploading] = useState(false);
  const price = data.price_cents ? Number(data.price_cents) / 100 : '';
  const prepMinutes = Math.round((data.avg_prep_seconds || 300) / 60);
  const preview = data.image_url ? `${API_URL}${data.image_url}` : getMenuImage(data.name);

  async function handleUpload(file) {
    if (!file) return;
    try {
      setUploading(true);
      const { url } = await api.uploadImage(file);
      setData(i => ({ ...i, image_url: url }));
      notify?.('Image téléversée ✓');
    } catch (err) {
      notify?.(err.message || 'Upload échoué');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Nom</label>
          <input className="input-field" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} placeholder="Ex: Ramen Shoyu" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Prix (€)</label>
          <input type="number" min="0" step="0.01" className="input-field" value={price} onChange={e => setData({ ...data, price_cents: Math.round(Number(e.target.value || 0) * 100) })} placeholder="Ex: 11.00" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
        <textarea className="input-field" rows={3} value={data.description} onChange={e => setData({ ...data, description: e.target.value })} placeholder="Ex: Bouillon soja, porc, nouilles" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">URL de l'image</label>
          <input className="input-field" value={data.image_url} onChange={e => setData({ ...data, image_url: e.target.value })} placeholder="/uploads/xxx.jpg ou https://..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Téléverser</label>
          <div className="flex items-center gap-3">
            <input type="file" accept="image/*" onChange={e => handleUpload(e.target.files?.[0])} />
            {uploading && <span className="text-sm text-slate-500">Envoi...</span>}
          </div>
          <p className="muted mt-1">Servies depuis /uploads/</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Préparation (min)</label>
          <input type="number" min="1" step="1" className="input-field" value={prepMinutes} onChange={e => setData({ ...data, avg_prep_seconds: Math.max(1, Number(e.target.value || 5)) * 60 })} />
        </div>
        <div className="flex items-center gap-2 pt-7">
          <input id="active" type="checkbox" checked={!!data.active} onChange={e => setData({ ...data, active: e.target.checked })} />
          <label htmlFor="active" className="text-sm text-slate-700">Actif</label>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          <span className="muted">Prévisualisation:</span>
          <img src={preview} alt="preview" className="w-20 h-16 object-cover rounded-md border border-slate-200 bg-slate-50" onError={(e)=>{e.target.style.display='none'}} />
        </div>
        <div className="flex gap-3">
          {onCancel && (
            <button onClick={onCancel} className="btn-secondary">
              Annuler
            </button>
          )}
          <button onClick={onSubmit} className="btn-primary">
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const { t } = useTranslation();
  const [authed, setAuthed] = useState(!!localStorage.getItem('admin_token'));
  const [hasAdmin, setHasAdmin] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [queue, setQueue] = useState({ currentServing: 0, queue: [] });
  const [menu, setMenu] = useState([]);
  const [notification, setNotification] = useState('');
  const [newItem, setNewItem] = useState(blankItem);
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState(null);

  useEffect(() => {
    // Check if at least one admin exists (for bootstrap flow)
    (async () => {
      try {
        const info = await api.authInfo();
        setHasAdmin(!!info.hasAdmin);
      } catch {
        setHasAdmin(true);
      }
    })();

    if (authed) {
      loadQueue();
      loadMenu();
      const socket = connectSocket();
      socket.on('queue_update', loadQueue);
      return () => socket.off('queue_update');
    }
  }, [authed]);

  async function login() {
    try {
      const res = await api.login(email, password);
      localStorage.setItem('admin_token', res.token);
      setAuthed(true);
      setNotification('');
      setEmail('');
      setPassword('');
    } catch (e) {
      setNotification(t('error.loginFailed'));
      setTimeout(() => setNotification(''), 3000);
    }
  }

  async function registerNewAdmin() {
    try {
      await api.register(newAdminEmail, newAdminPassword);
      showNotification('Admin créé avec succès ✓');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setShowRegisterModal(false);
    } catch (e) {
      setNotification(e.message || 'Erreur lors de la création');
      setTimeout(() => setNotification(''), 3000);
    }
  }

  async function loadQueue() {
    const data = await api.getQueue();
    setQueue(data);
  }

  async function loadMenu() {
    const data = await api.getMenu();
    setMenu(data);
  }

  async function handleValidate(id) {
    await api.validateOrder(id);
    loadQueue();
    showNotification('Commande validée ✓');
  }

  async function handleReady(id) {
    await api.markReady(id);
    loadQueue();
    showNotification('Marquée comme prête ✓');
  }

  async function handleServed(id) {
    await api.markServed(id);
    loadQueue();
    showNotification('Commande servie ✓');
  }

  function showNotification(msg) {
    setNotification(msg);
    setTimeout(() => setNotification(''), 2000);
  }

  function openEditModal(item) {
    setEditingItem(item);
    setEditFormData({ ...item });
  }

  async function addItem() {
    if (!newItem.name || !newItem.price_cents) {
      showNotification('Nom et prix requis');
      return;
    }
    try {
      await api.createMenuItem({ ...newItem });
      setNewItem(blankItem);
      await loadMenu();
      showNotification('Plat ajouté ✓');
    } catch (e) {
      showNotification(`Erreur: ${e.message}`);
    }
  }

  async function saveEditedItem() {
    if (!editFormData.name || !editFormData.price_cents) {
      showNotification('Nom et prix requis');
      return;
    }
    try {
      await api.updateMenuItem(editingItem.id, editFormData);
      setEditingItem(null);
      setEditFormData(null);
      await loadMenu();
      showNotification('Plat modifié ✓');
    } catch (e) {
      showNotification('Erreur lors de la modification');
    }
  }

  function logout() {
    localStorage.removeItem('admin_token');
    setAuthed(false);
  }

  if (!authed && hasAdmin) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="card w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/assets/logo.png" alt="GLesCrocs" className="mx-auto w-20 h-20 mb-4 rounded-md bg-white/90 p-2" onError={(e)=>{e.target.style.display='none'}} />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
              {t('admin.login')}
            </h1>
            <p className="text-sm text-slate-500 mt-2">{t('admin.title')}</p>
          </div>

          {notification && (
            <div className="mb-4 p-3 bg-red-100 border border-red-500 rounded-lg text-red-700 text-sm">
              {notification}
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('admin.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && login()}
                className="input-field"
                placeholder="admin@demo.local"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('admin.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && login()}
                className="input-field"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 mb-2">
            <button onClick={login} className="btn-primary w-full">
              {t('admin.signIn')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Bootstrap: show first-admin creation when no admin exists yet
  if (!authed && !hasAdmin) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="card w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Créer le premier administrateur</h1>
            <p className="text-sm text-slate-600 mt-1">Ce formulaire est disponible uniquement car aucun admin n’existe encore.</p>
          </div>

          {notification && (
            <div className="mb-4 p-3 bg-red-100 border border-red-500 rounded-lg text-red-700 text-sm">
              {notification}
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="input-field" placeholder="vous@exemple.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Mot de passe</label>
              <input type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} className="input-field" placeholder="••••••••" />
              <p className="text-xs text-slate-500 mt-2">Minimum 6 caractères</p>
            </div>
          </div>

          <button
            onClick={async () => {
              try {
                const res = await api.register(newAdminEmail, newAdminPassword);
                if (res?.token) {
                  localStorage.setItem('admin_token', res.token);
                  setAuthed(true);
                  setHasAdmin(true);
                  setNotification('Admin créé ✓');
                } else {
                  setNotification('Création réussie, veuillez vous connecter');
                }
              } catch (e) {
                setNotification(e.message || 'Erreur de création');
                setTimeout(() => setNotification(''), 3000);
              }
            }}
            className="btn-primary w-full"
          >
            Créer l’admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3">
            <img src="/assets/logo.png" alt="GLesCrocs" className="w-12 h-12 rounded-md" onError={(e)=>{e.target.style.display='none'}} />
            <span className="text-2xl font-extrabold">GLesCrocs</span>
            <span className="text-base text-slate-600 ml-2">{t('admin.title')}</span>
          </h1>
          <p className="text-slate-600 mt-2">Gérez votre file d'attente et votre menu</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowRegisterModal(true)} className="btn-secondary flex items-center gap-2">
            ➕ Nouvel admin
          </button>
          <button onClick={logout} className="btn-secondary flex items-center gap-2">
            <LogOut className="w-5 h-5" /> {t('admin.logout')}
          </button>
        </div>
      </div>

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">Créer un nouvel admin</h2>
            
            {notification && (
              <div className="mb-4 p-3 bg-red-100 border border-red-500 rounded-lg text-red-700 text-sm">
                {notification}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="input-field"
                  placeholder="nouveau@admin.local"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Mot de passe</label>
                <input
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                />
                <p className="text-xs text-slate-500 mt-2">Min 6 caractères</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowRegisterModal(false)} className="btn-secondary w-full">
                Annuler
              </button>
              <button onClick={registerNewAdmin} className="btn-primary w-full">
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Serving Display */}
      <div className="card bg-gradient-to-r from-primary-600 to-primary-800 text-white border-none">
        <div className="text-center">
          <p className="text-primary-100 mb-2">{t('client.currentNumber')}</p>
          <div className="text-7xl font-bold animate-bounce-in mb-2">{queue.currentServing}</div>
          <p className="text-primary-100">🎫 {queue.queue.length} {t('client.queue')}</p>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="animate-slide-in card bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500">
          <div className="flex items-center gap-3">
            <Check className="w-6 h-6 text-green-600" />
            <p className="text-green-700 font-semibold">{notification}</p>
          </div>
        </div>
      )}

      {/* Queue Management */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <span className="text-3xl">📋</span> {t('admin.queue')} ({queue.queue.length})
        </h2>

        {queue.queue.length === 0 ? (
          <div className="card text-center py-12 bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="text-5xl mb-4">🎉</div>
            <p className="text-slate-600 text-lg">Aucune commande en attente</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {queue.queue.map(order => (
              <div
                key={order.ticket_number != null ? order.ticket_number : `order-${queue.queue.indexOf(order)}`}
                className={`card transition-all duration-300 ${
                  order.status === 'READY'
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-green-500'
                    : order.status === 'PENDING'
                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-l-orange-500'
                    : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-l-blue-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold text-primary-600">#{order.ticket_number}</div>
                      {order.order_number && (
                        <span className="ml-2 text-xs text-slate-500">Commande client n°{order.order_number}</span>
                      )}
                      <div>
                        <span
                          className={`badge ${
                            order.status === 'READY'
                              ? 'badge-success'
                              : order.status === 'VALIDATED'
                              ? 'badge-warning'
                              : 'badge-info'
                          }`}
                        >
                          {order.status === 'READY' && '✓ '}
                          {order.status === 'READY' ? t('status.ready') : order.status === 'VALIDATED' ? t('status.validated') : t('status.pending')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 text-slate-700">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">
                        {order.estimated_wait_seconds !== undefined ? Math.round(order.estimated_wait_seconds / 60) : '?'} {t('time.minutes')}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => handleValidate(order.ticket_number)}
                        className="btn-small bg-primary-600 text-white hover:bg-primary-700"
                      >
                        ✓ {t('admin.validateOrder')}
                      </button>
                    )}
                    {order.status === 'VALIDATED' && (
                      <button
                        onClick={() => handleReady(order.ticket_number)}
                        className="btn-small bg-orange-500 text-white hover:bg-orange-600"
                      >
                        🔔 {t('admin.markReady')}
                      </button>
                    )}
                    {order.status === 'READY' && (
                      <button
                        onClick={() => handleServed(order.ticket_number)}
                        className="btn-small bg-green-600 text-white hover:bg-green-700"
                      >
                        ✓ {t('admin.markServed')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Menu Management */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <span className="text-3xl">🍜</span> {t('admin.menu')} ({menu.length})
        </h2>

        {/* Add new menu item */}
        <div className="card mb-6">
          <h3 className="text-lg font-bold mb-4">Ajouter un plat</h3>
          <MenuForm data={newItem} setData={setNewItem} onSubmit={addItem} submitLabel="Ajouter" notify={showNotification} />
        </div>

        {menu.length === 0 ? (
          <div className="card text-center py-12 bg-gradient-to-br from-slate-50 to-slate-100">
            <p className="text-slate-600 text-lg">Aucun plat au menu</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {menu.map(item => (
              <div key={item.id != null ? item.id : `item-${menu.indexOf(item)}`} className="card">
                <div className="flex items-start justify-between mb-3 gap-4">
                  <img src={item.image_url ? `${API_URL}${item.image_url}` : getMenuImage(item.name)} alt={item.name} className="w-24 h-20 object-cover rounded-md mr-2" onError={(e)=>{e.target.style.display='none'}} />
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-900">{item.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">ID: {item.id}</p>
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">{item.description}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-4 h-4" />
                      {Math.round(item.avg_prep_seconds / 60)} {t('time.minutes')}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <span className="badge-success whitespace-nowrap ml-2">{(item.price_cents / 100).toFixed(2)}€</span>
                    <button onClick={() => openEditModal(item)} className="btn-small bg-slate-200 text-slate-700 hover:bg-slate-300">✏️ {t('admin.edit')}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Menu Item Modal */}
      {editingItem && editFormData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-6">Modifier: {editingItem.name}</h2>
            
            {notification && (
              <div className="mb-4 p-3 bg-red-100 border border-red-500 rounded-lg text-red-700 text-sm">
                {notification}
              </div>
            )}
            <MenuForm
              data={editFormData}
              setData={setEditFormData}
              onSubmit={saveEditedItem}
              submitLabel="Enregistrer"
              onCancel={() => { setEditingItem(null); setEditFormData(null); }}
              notify={showNotification}
            />
          </div>
        </div>
      )}
    </div>
  );
}

