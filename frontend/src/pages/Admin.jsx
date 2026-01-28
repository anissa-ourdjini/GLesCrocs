import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { connectSocket } from '../services/socket';
import { LogOut, Plus, ChefHat, Clock, Check, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';

export default function Admin() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('admin_token'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [queue, setQueue] = useState([]);
  const [menu, setMenu] = useState([]);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newImage, setNewImage] = useState(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetails, setOrderDetails] = useState({});

  useEffect(() => {
    if (authed) {
      loadQueue();
      loadMenu();
      const socket = connectSocket();
      socket.on('queue_update', () => {
        loadQueue();
        loadMenu();
      });
      return () => socket.off('queue_update');
    }
  }, [authed]);

  const loadQueue = async () => {
    try {
      const data = await api.getQueue();
      setQueue(data.queue || []);
      // Précharger les détails de tous les items
      const details = {};
      for (const order of data.queue || []) {
        if (!orderDetails[order.id]) {
          try {
            const itemRes = await fetch(`http://localhost:4000/api/orders/${order.id}/items`);
            if (itemRes.ok) {
              details[order.id] = await itemRes.json();
            }
          } catch (e) {
            console.error('Erreur items:', e);
          }
        }
      }
      if (Object.keys(details).length > 0) {
        setOrderDetails(prev => ({ ...prev, ...details }));
      }
    } catch (e) {
      console.error('Erreur queue:', e);
    }
  };

  const loadMenu = async () => {
    try {
      const data = await api.getMenu();
      setMenu(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erreur menu:', e);
    }
  };

  const login = async () => {
    try {
      const res = await api.login(email, password);
      localStorage.setItem('admin_token', res.token);
      setAuthed(true);
      setEmail('');
      setPassword('');
    } catch (e) {
      alert('Erreur connexion: ' + (e.message || ''));
    }
  };

  const validateOrder = async (id) => {
    try {
      await api.validateOrder(id);
      await loadQueue();
    } catch (e) {
      alert('Erreur: ' + e.message);
    }
  };

  const markReady = async (id) => {
    try {
      await api.markReady(id);
      await loadQueue();
    } catch (e) {
      alert('Erreur: ' + e.message);
    }
  };

  const markServed = async (id) => {
    try {
      await api.markServed(id);
      await loadQueue();
    } catch (e) {
      alert('Erreur: ' + e.message);
    }
  };

  const addItem = async () => {
    if (!newName || !newPrice) {
      alert('Remplir nom et prix');
      return;
    }
    try {
      let imageUrl = newImageUrl;
      
      // Si un fichier est sélectionné, l'uploader
      if (newImage) {
        const uploadRes = await api.uploadImage(newImage);
        imageUrl = uploadRes.url;
      }
      
      if (editingId) {
        // Modification
        await api.updateMenuItem(editingId, {
          name: newName,
          description: newDesc,
          price_cents: Math.round(parseFloat(newPrice) * 100),
          image_url: imageUrl,
          active: true
        });
        setEditingId(null);
      } else {
        // Création
        await api.createMenuItem({
          name: newName,
          description: newDesc,
          price_cents: Math.round(parseFloat(newPrice) * 100),
          avg_prep_seconds: 300,
          image_url: imageUrl,
          active: true
        });
      }
      
      setNewName('');
      setNewPrice('');
      setNewDesc('');
      setNewImage(null);
      setNewImageUrl('');
      await loadMenu();
    } catch (e) {
      alert('Erreur: ' + e.message);
    }
  };

  const editItem = (item) => {
    setEditingId(item.id);
    setNewName(item.name);
    setNewDesc(item.description || '');
    setNewPrice((item.price_cents / 100).toString());
    setNewImageUrl(item.image_url || '');
    setNewImage(null);
  };

  const deleteItem = async (id) => {
    if (confirm('Supprimer ce plat ?')) {
      try {
        await api.deleteMenuItem(id);
        await loadMenu();
      } catch (e) {
        alert('Erreur: ' + e.message);
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewName('');
    setNewPrice('');
    setNewDesc('');
    setNewImage(null);
    setNewImageUrl('');
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setAuthed(false);
  };

  // CONNEXION
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-orange-50 p-4">
        <div className="card max-w-md w-full bg-white shadow-xl rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">👨‍🍳</div>
            <h1 className="text-3xl font-bold text-slate-800">Admin</h1>
            <p className="text-slate-600 mt-2">Gestion cuisine</p>
          </div>

          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && login()}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-primary-500"
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && login()}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-primary-500"
            />
            <button
              onClick={login}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-bold py-3 rounded-lg transition"
            >
              Connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ADMIN PAGE
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-orange-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-6 shadow-lg border-l-4 border-primary-500 mb-8">
          <div className="flex items-center gap-4">
            <ChefHat className="w-10 h-10 text-primary-500" />
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Admin Panel</h1>
              <p className="text-slate-600">Gestion en temps réel</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition"
          >
            <LogOut className="w-5 h-5" /> Déconnexion
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* QUEUE SECTION */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border-2 border-orange-200 shadow-lg">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-orange-700">
                <Clock className="w-7 h-7" /> Commandes ({queue.length})
              </h2>

              {queue.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-4">😴</p>
                  <p className="text-slate-600">Aucune commande</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {queue.map((order) => (
                    <div
                      key={order.id}
                      className={`p-4 rounded-xl border-2 transition ${
                        order.status === 'VALIDATED'
                          ? 'bg-blue-50 border-blue-300'
                          : order.status === 'READY'
                          ? 'bg-green-50 border-green-300'
                          : 'bg-orange-50 border-orange-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl font-bold">🎫 #{order.ticket_number || order.id}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full ${
                              order.status === 'VALIDATED'
                                ? 'bg-blue-200 text-blue-700'
                                : order.status === 'READY'
                                ? 'bg-green-200 text-green-700'
                                : 'bg-orange-200 text-orange-700'
                            }`}
                          >
                            {order.status}
                          </span>
                          <button
                            onClick={() => setSelectedOrderId(selectedOrderId === order.id ? null : order.id)}
                            className="p-1 hover:bg-white/50 rounded transition"
                          >
                            {selectedOrderId === order.id ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Items détails */}
                      {selectedOrderId === order.id && (
                        <div className="mb-4 p-3 bg-white/50 rounded-lg border border-current/20">
                          <p className="font-semibold text-slate-700 mb-2">📋 Items :</p>
                          {orderDetails[order.id]?.length > 0 ? (
                            <div className="space-y-1">
                              {orderDetails[order.id].map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span>{item.quantity}x {item.name}</span>
                                  <span className="font-semibold">{((item.price_cents * item.quantity) / 100).toFixed(2)}€</span>
                                </div>
                              ))}
                              <div className="border-t pt-1 mt-1 font-bold text-slate-800">
                                Total: {(orderDetails[order.id].reduce((sum, item) => sum + (item.price_cents * item.quantity), 0) / 100).toFixed(2)}€
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600">Chargement...</p>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => validateOrder(order.id)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold transition"
                          >
                            ✓ Valider
                          </button>
                        )}
                        {order.status === 'VALIDATED' && (
                          <button
                            onClick={() => markReady(order.id)}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition"
                          >
                            👨‍🍳 Prêt
                          </button>
                        )}
                        {order.status === 'READY' && (
                          <button
                            onClick={() => markServed(order.id)}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition"
                          >
                            <Check className="w-4 h-4" /> Servie
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* MENU SECTION */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200 shadow-lg h-fit">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-green-700">
              <Edit2 className="w-7 h-7" /> {editingId ? 'Modifier' : 'Ajouter'}
            </h2>

            <div className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Nom du plat"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:border-green-500"
              />
              <input
                type="text"
                placeholder="Description"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-4 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:border-green-500"
              />
              <input
                type="number"
                placeholder="Prix (€)"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                step="0.01"
                className="w-full px-4 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:border-green-500"
              />
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setNewImage(e.target.files[0]);
                    if (e.target.files[0]) {
                      setNewImageUrl(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                  className="w-full px-4 py-2 border-2 border-green-300 rounded-lg"
                />
                {newImageUrl && (
                  <img src={newImageUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg mt-2" />
                )}
              </div>
              <button
                onClick={addItem}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
              >
                {editingId ? (
                  <>
                    <Edit2 className="w-5 h-5" /> Modifier
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" /> Ajouter
                  </>
                )}
              </button>
              {editingId && (
                <button
                  onClick={cancelEdit}
                  className="w-full bg-slate-400 hover:bg-slate-500 text-white font-bold py-2 rounded-lg transition"
                >
                  Annuler
                </button>
              )}
            </div>

            <div className="border-t-2 border-green-300 pt-4">
              <h3 className="font-bold text-slate-700 mb-3">Menu ({menu.length})</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {menu.length === 0 ? (
                  <p className="text-slate-500 text-sm">Vide</p>
                ) : (
                  menu.map((item) => (
                    <div key={item.id} className="bg-white/60 p-3 rounded-lg border border-green-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          <p className="text-xs text-slate-600">{item.description}</p>
                          <p className="text-sm font-bold text-green-600 mt-1">{(item.price_cents / 100).toFixed(2)}€</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => editItem(item)}
                            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

