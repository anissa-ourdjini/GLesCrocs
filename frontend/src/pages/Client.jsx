import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api, API_URL } from '../services/api';
import { connectSocket } from '../services/socket';
import { ShoppingCart, Clock, ChefHat, AlertCircle } from 'lucide-react';
import { getMenuImage } from '../utils/images';

export default function Client() {
  const { t } = useTranslation();
  const [queue, setQueue] = useState({ currentServing: 0, queue: [] });
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [myTicket, setMyTicket] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMenu();
    loadQueue();
    const socket = connectSocket();
    socket.on('queue_update', () => {
      loadQueue();
      loadMenu();
    });
    return () => socket.off('queue_update');
  }, []);

  async function loadMenu() {
    try {
      const data = await api.getMenu();
      setMenu(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erreur chargement menu:', e);
      setMenu([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadQueue() {
    const data = await api.getQueue();
    setQueue(data);
  }

  function addToCart(item) {
    const existing = cart.find(c => c.menu_item_id === item.id);
    if (existing) {
      setCart(cart.map(c => c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { menu_item_id: item.id, name: item.name, price: item.price_cents / 100, quantity: 1 }]);
    }
  }

  async function submitOrder() {
    if (cart.length === 0) return;
    try {
      const order = await api.createOrder({ items: cart, customer_name: 'Client' });
      setMyTicket(order.ticket_number);
      setCart([]);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 4000);
    } catch (e) {
      console.error('Erreur commande:', e);
    }
  }

  const position = queue.queue.findIndex(q => q.ticket_number === myTicket) + 1;
  const myOrder = queue.queue.find(q => q.ticket_number === myTicket);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass rounded-2xl overflow-hidden h-72 md:h-96 relative group">
          <img src="/assets/logo.png" alt="GLesCrocs" className="absolute inset-0 w-full h-full object-contain bg-white" />
          <div className="absolute inset-0 bg-black/35 group-hover:bg-black/25 transition-all duration-300" />
          <div className="absolute inset-0 flex items-end p-6">
            <div className="glass rounded-xl p-6 w-full flex items-center gap-4">
              <img src="/assets/logo.png" alt="GLesCrocs" className="w-16 h-16 rounded-md bg-white/90 p-1" onError={(e)=>{e.target.style.display='none'}} />
              <div>
                <h1 className="text-2xl font-bold text-white">GLesCrocs</h1>
                <p className="text-sm text-white/80">{t('app.subtitle')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card h-full flex flex-col justify-center text-center bg-gradient-to-br from-green-50 to-emerald-50">
            <div className="text-5xl font-bold text-primary-600">{queue.currentServing}</div>
            <p className="text-sm text-slate-600 mt-2">{t('client.currentNumber')}</p>
            <p className="text-xs text-slate-500 mt-1">{queue.queue.length} {t('client.queue')}</p>
          </div>
        </div>
      </div>

      {/* Notification */}
      {showNotification && (
        <div className="animate-slide-in card bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500">
          <div className="flex items-center gap-4">
            <div className="text-3xl">✅</div>
            <div>
              <h3 className="font-bold text-green-700">{t('client.orderPlaced')}</h3>
              <p className="text-sm text-green-600">{t('client.yourNumber')}: <strong>{myTicket}</strong></p>
            </div>
          </div>
        </div>
      )}

      {/* My Order Status */}
      {myTicket && myOrder && (
        <div className={`card ${myOrder.status === 'READY' ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-l-4 border-green-500' : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-orange-500'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="text-4xl">{myOrder.status === 'READY' ? '🎉' : '⏳'}</div>
              <div>
                <h3 className={`text-xl font-bold ${myOrder.status === 'READY' ? 'text-green-700' : 'text-orange-700'}`}>
                  {t('client.yourNumber')}: <span className="text-3xl">{myTicket}</span>
                </h3>
                {position > 0 && <p className="text-sm text-slate-600 mt-2">📍 Position: {position}</p>}
                {myOrder.estimated_wait_seconds && (
                  <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4" /> {Math.round(myOrder.estimated_wait_seconds / 60)} {t('time.minutes')}
                  </p>
                )}
                {/* Bouton annuler commande */}
                {myOrder.status !== 'READY' && myOrder.status !== 'SERVED' && myOrder.status !== 'CANCELLED' && (
                  <button
                    className="btn-danger mt-2 px-4 py-2 rounded"
                    onClick={async () => {
                      try {
                        await fetch(`${API_URL}/api/orders/${myOrder.id}/cancel`, { method: 'POST' });
                        setMyTicket(null);
                      } catch (e) {
                        alert('Erreur lors de l\'annulation');
                      }
                    }}
                  >Annuler la commande</button>
                )}
              </div>
            </div>
            {myOrder.status === 'READY' && (
              <span className="badge-success animate-pulse">
                <ChefHat className="w-4 h-4" /> {t('status.ready')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Menu Section */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-slate-900">
          <span className="text-3xl">🍜</span> {t('client.menu')}
        </h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">🔄</div>
            <p className="text-slate-600 mt-4">Chargement du menu...</p>
          </div>
        ) : menu.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Le menu est indisponible pour le moment.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {menu.map(item => (
              <div key={item.id} className="card group cursor-pointer hover:border-l-accent-500 overflow-hidden">
                <div className="h-48 rounded-lg mb-4 overflow-hidden flex items-center justify-center bg-slate-100">
                  <img src={item.image_url ? `${API_URL}${item.image_url}` : getMenuImage(item.name)} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <h3 className="font-bold text-lg text-slate-900">{item.name}</h3>
                <p className="text-sm text-slate-600 mt-2 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                  <span className="text-xl font-bold text-accent-600">{(item.price_cents / 100).toFixed(2)}€</span>
                  <button
                    onClick={() => addToCart(item)}
                    className="btn-primary rounded-full px-4 py-2 text-lg"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Section */}
      {cart.length > 0 && (
        <div className="card bg-gradient-to-r from-primary-50 to-purple-50 border-l-4 border-primary-500 sticky bottom-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold flex items-center gap-2 text-primary-700">
              <ShoppingCart className="w-5 h-5" /> {t('client.cart')} ({cart.length})
            </h4>
            <button onClick={() => setCart([])} className="text-xs text-slate-500 hover:text-slate-700 underline">
              ✕ {t('admin.cancel')}
            </button>
          </div>
          
          <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
            {cart.map((item, i) => (
              <div key={i} className="flex justify-between items-center bg-white rounded-lg p-3 border border-slate-200">
                <div>
                  <span className="font-medium text-slate-900">{item.name}</span>
                  <span className="text-sm text-slate-600 ml-2">x{item.quantity}</span>
                </div>
                <span className="font-bold text-primary-600">{(item.price * item.quantity).toFixed(2)}€</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg border-2 border-primary-300">
            <span className="font-bold text-slate-900">{t('client.total')}:</span>
            <span className="text-2xl font-bold text-accent-600">{totalPrice.toFixed(2)}€</span>
          </div>

          <button onClick={submitOrder} className="btn-primary w-full text-lg">
            🍱 {t('client.checkout')}
          </button>
        </div>
      )}

      {/* Ticket Lookup */}
      {!myTicket && (
        <div className="card bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 text-center">
          <div className="flex justify-center mb-4 text-3xl">🎫</div>
          <p className="text-sm text-slate-600 mb-4">{t('admin.email')}</p>
          <input
            type="number"
            placeholder="ex: 42"
            onChange={(e) => setMyTicket(Number(e.target.value) || null)}
            className="input-field mb-2 text-center"
          />
          <p className="text-xs text-slate-500">{t('client.orderPlaced')}</p>
        </div>
      )}

      {/* Mes commandes par client avec numéro */}
      {queue.queue && queue.queue.length > 0 && (
        <div className="card bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 mt-4">
          <h3 className="font-bold mb-2">Mes commandes (numérotées)</h3>
          <ul className="space-y-2">
            {queue.queue.filter(q => q.client_uid && localStorage.getItem('client_uid') && q.client_uid === localStorage.getItem('client_uid')).map(order => (
              <li key={order.id} className="flex items-center gap-4">
                <span className="font-bold">Commande {order.order_number}</span>
                <span className="text-xs text-slate-600">{order.status}</span>
                {order.estimated_wait_seconds && (
                  <span className="text-xs text-slate-500 ml-2">⏳ {Math.round(order.estimated_wait_seconds / 60)} min</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

