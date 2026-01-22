import { useState, useEffect } from 'react';
import { api, API_URL } from '../services/api';
import { connectSocket } from '../services/socket';
import { ShoppingCart, Clock, ChefHat } from 'lucide-react';
import { getMenuImage } from '../utils/images';

export default function Client() {
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
      setMyTicket(order.id);
      setCart([]);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 4000);
    } catch (e) {
      console.error('Erreur commande:', e);
    }
  }

  const myOrder = queue.queue.find(q => q.id === myTicket);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass rounded-2xl overflow-hidden h-72 md:h-96 relative group">
          <img src="/assets/logo.png" alt="GLesCrocs" className="absolute inset-0 w-full h-full object-contain bg-white" />
        </div>
        <div className="space-y-4">
          <div className="card h-full flex flex-col justify-center text-center bg-gradient-to-br from-green-50 to-emerald-50">
            <div className="text-5xl font-bold text-primary-600">{queue.currentServing}</div>
            <p className="text-sm text-slate-600 mt-2">Numéro en cours</p>
            <p className="text-xs text-slate-500 mt-1">{queue.queue.length} commandes</p>
          </div>
        </div>
      </div>

      {showNotification && (
        <div className="animate-slide-in card bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500">
          <div className="flex items-center gap-4">
            <div className="text-3xl">✅</div>
            <div>
              <h3 className="font-bold text-green-700">Commande créée!</h3>
              <p className="text-sm text-green-600">Numéro: <strong>{myTicket}</strong></p>
            </div>
          </div>
        </div>
      )}

      {myTicket && myOrder && (
        <div className={`card ${myOrder.status === 'READY' ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-l-4 border-green-500' : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-orange-500'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="text-4xl">{myOrder.status === 'READY' ? '🎉' : '⏳'}</div>
              <div>
                <h3 className={`text-xl font-bold ${myOrder.status === 'READY' ? 'text-green-700' : 'text-orange-700'}`}>
                  Votre numéro: <span className="text-3xl">{myOrder.ticket_number}</span>
                </h3>
                {myOrder.estimated_wait_seconds && (
                  <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4" /> {Math.round(myOrder.estimated_wait_seconds / 60)} min
                  </p>
                )}
              </div>
            </div>
            {myOrder.status === 'READY' && (
              <span className="badge-success animate-pulse flex items-center gap-2">
                <ChefHat className="w-4 h-4" /> Prêt!
              </span>
            )}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <span className="text-3xl">🍜</span> Menu
        </h2>
        {loading ? (
          <div className="text-center py-12"><p className="text-slate-600">Chargement...</p></div>
        ) : menu.length === 0 ? (
          <div className="text-center py-12"><p className="text-slate-600">Menu indisponible</p></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {menu.map(item => (
              <div key={item.id} className="card group">
                <div className="h-48 rounded-lg mb-4 overflow-hidden bg-slate-100 flex items-center justify-center">
                  <img src={item.image_url ? `${API_URL}${item.image_url}` : getMenuImage(item.name)} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <h3 className="font-bold text-lg">{item.name}</h3>
                <p className="text-sm text-slate-600 mt-2 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-xl font-bold text-accent-600">{(item.price_cents / 100).toFixed(2)}€</span>
                  <button onClick={() => addToCart(item)} className="btn-primary rounded-full px-4 py-2">+</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="card bg-gradient-to-r from-primary-50 to-purple-50 border-l-4 border-primary-500 sticky bottom-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Panier ({cart.length})
            </h4>
            <button onClick={() => setCart([])} className="text-xs text-slate-500 hover:text-slate-700 underline">✕ Vider</button>
          </div>
          <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
            {cart.map((item, i) => (
              <div key={i} className="flex justify-between items-center bg-white rounded-lg p-3 border">
                <div>
                  <span className="font-medium">{item.name}</span>
                  <span className="text-sm text-slate-600 ml-2">x{item.quantity}</span>
                </div>
                <span className="font-bold text-primary-600">{(item.price * item.quantity).toFixed(2)}€</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg border-2 border-primary-300">
            <span className="font-bold">Total:</span>
            <span className="text-2xl font-bold text-accent-600">{totalPrice.toFixed(2)}€</span>
          </div>
          <button onClick={submitOrder} className="btn-primary w-full text-lg">🍱 Commander</button>
        </div>
      )}

      {!myTicket && queue.queue.length > 0 && (
        <div className="card bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 text-center">
          <div className="flex justify-center mb-4 text-3xl">🎫</div>
          <p className="text-sm text-slate-600 mb-4">Chercher mon numéro</p>
          <input
            type="number"
            placeholder="ex: 42"
            onChange={(e) => {
              const num = Number(e.target.value);
              const found = queue.queue.find(q => q.ticket_number === num);
              if (found) setMyTicket(found.id);
            }}
            className="input-field mb-2 text-center"
          />
        </div>
      )}
    </div>
  );
}

