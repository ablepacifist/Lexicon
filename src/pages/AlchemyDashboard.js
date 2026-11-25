import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { useAvatar } from '../hooks/useAvatar';
import Navbar from '../components/Navbar';
import ItemModal from '../components/ItemModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Toast, useToast } from '../components/Toast';
import { alchemyFetch, alchemyError } from '../utils/alchemyApi';
import background from '../assets/images/dashboard_background.webp';
import brewIcon from '../assets/images/brew.webp';
import forageIcon from '../assets/images/forage.webp';
import consumePotionIcon from '../assets/images/drink.webp';
import consumeIngredientIcon from '../assets/images/consume.webp';
import '../animations.css';
import './PageStyles.css';
import './AlchemyDashboard.css';

const AlchemyDashboard = () => {
  const { user } = useContext(UserContext);
  const { avatarUrl } = useAvatar(user?.username);
  const playerId = user?.id;

  const [ingredients, setIngredients] = useState([]);
  const [potions, setPotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);

  const [brewSelection, setBrewSelection] = useState({ ingredient1: '', ingredient2: '' });
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedType, setSelectedType] = useState('');
  const [confirmForage, setConfirmForage] = useState(false);

  const [animationType, setAnimationType] = useState(null);
  const [consumeAnimationType, setConsumeAnimationType] = useState(null);
  const { toast, show: showToast, dismiss: dismissToast } = useToast();

  const fetchInventory = useCallback(async () => {
    if (playerId === undefined || playerId === null) return;
    setLoading(true);
    setLoadError('');
    try {
      const response = await alchemyFetch(`/api/player/inventory/${playerId}`);
      if (!response.ok) {
        // Used to fall through to "No ingredients available", so a failure looked like an empty bag.
        setLoadError(await alchemyError(response, "Couldn't load your inventory."));
        return;
      }
      const data = await response.json();
      setIngredients(Array.isArray(data.ingredients) ? data.ingredients : []);
      setPotions(Array.isArray(data.potions) ? data.potions : []);
    } catch (e) {
      setLoadError(e.message || "Couldn't reach the Alchemy server.");
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const play = (setter, type) => {
    setter(type);
    setTimeout(() => setter(null), 2000);
  };

  const handleBrewPotion = async () => {
    if (!brewSelection.ingredient1 || !brewSelection.ingredient2) {
      showToast('Choose two ingredients to brew.', 'error');
      return;
    }
    setBusy(true);
    try {
      play(setAnimationType, 'brew');
      const response = await alchemyFetch('/api/potion/brew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          ingredientId1: parseInt(brewSelection.ingredient1, 10),
          ingredientId2: parseInt(brewSelection.ingredient2, 10),
        }),
      });
      if (response.ok) {
        showToast('Potion brewed.');
        setBrewSelection({ ingredient1: '', ingredient2: '' });
        fetchInventory();
      } else {
        showToast(await alchemyError(response, 'That brew failed.'), 'error');
      }
    } catch (e) {
      showToast(e.message || "Couldn't reach the Alchemy server.", 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleForage = async () => {
    setConfirmForage(false);
    setBusy(true);
    try {
      play(setAnimationType, 'forage');
      const response = await alchemyFetch(`/api/player/forage/${playerId}`);
      if (response.ok) {
        const data = await response.json();
        showToast(`You found: ${data.forage}`);
        fetchInventory();
      } else {
        showToast(await alchemyError(response, 'Foraging failed.'), 'error');
      }
    } catch (e) {
      showToast(e.message || "Couldn't reach the Alchemy server.", 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleConsume = async () => {
    if (!selectedItem) return;
    const isIngredient = selectedType === 'ingredient';
    setBusy(true);
    try {
      const response = await alchemyFetch(
        isIngredient ? '/api/player/ingredient/consume' : '/api/player/potion/consume',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isIngredient
            ? { playerId, ingredientId: selectedItem.id }
            : { playerId, potionId: selectedItem.id }),
        },
      );
      if (response.ok) {
        play(setConsumeAnimationType, isIngredient ? 'consumeIngredient' : 'consumePotion');
        showToast(isIngredient ? `You ate the ${selectedItem.name}.` : `You drank the ${selectedItem.name}.`);
        closeModal();
        fetchInventory();
      } else {
        showToast(await alchemyError(response, isIngredient ? "Couldn't eat that." : "Couldn't drink that."), 'error');
      }
    } catch (e) {
      showToast(e.message || "Couldn't reach the Alchemy server.", 'error');
    } finally {
      setBusy(false);
    }
  };

  const openModal = (item, type) => {
    setSelectedItem(item);
    setSelectedType(type);
  };

  const closeModal = () => {
    setSelectedItem(null);
    setSelectedType('');
  };

  const renderList = (items, type, emptyText) => {
    if (loading && items.length === 0) return <p className="alchemy-muted">Loading…</p>;
    if (loadError) return <p className="alchemy-muted">—</p>;
    if (items.length === 0) return <p className="alchemy-muted">{emptyText}</p>;
    return (
      <ul className="alchemy-list">
        {items.map((it) => (
          <li key={it.id}>
            <button type="button" className="alchemy-item" onClick={() => openModal(it, type)}>
              <span className="alchemy-item__name">{it.name}</span>{' '}
              <span className="alchemy-item__qty">×{it.quantity}</span>
              {type === 'ingredient' && Array.isArray(it.effects) && it.effects.length > 0 && (
                <span className="alchemy-item__effects">{it.effects.map((e) => e.title).join(', ')}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <>
      <Navbar />
      <main className="alchemy-page">
        <div className="alchemy-page__bg" style={{ backgroundImage: `url(${background})` }} aria-hidden="true" />
        <div className="alchemy-shell">
          <header className="alchemy-header">
            {avatarUrl && <img src={avatarUrl} alt="" />}
            <div>
              <h1>Alchemy</h1>
              <p>Welcome, {user?.username || 'traveller'}.</p>
            </div>
          </header>

          {loadError && (
            <div className="lx-alert lx-alert--error" role="alert">
              {loadError}{' '}
              <button type="button" className="lx-btn lx-btn--secondary" onClick={fetchInventory}>Try again</button>
            </div>
          )}

          <div className="alchemy-panels">
            <section className="alchemy-panel" aria-labelledby="alchemy-ingredients">
              <h2 id="alchemy-ingredients">Ingredients</h2>
              {renderList(ingredients, 'ingredient', 'Nothing gathered yet. Forage to find ingredients.')}
            </section>
            <section className="alchemy-panel" aria-labelledby="alchemy-potions">
              <h2 id="alchemy-potions">Potions</h2>
              {renderList(potions, 'potion', 'No potions brewed yet.')}
            </section>
          </div>

          <section className="alchemy-panel" aria-labelledby="alchemy-brew">
            <h2 id="alchemy-brew">Brew</h2>
            <div className="alchemy-brew">
              {['ingredient1', 'ingredient2'].map((slot, i) => (
                <div className="lx-field" key={slot}>
                  <label htmlFor={`brew-${slot}`}>Ingredient {i + 1}</label>
                  <select
                    id={`brew-${slot}`}
                    value={brewSelection[slot]}
                    onChange={(e) => setBrewSelection({ ...brewSelection, [slot]: e.target.value })}
                  >
                    <option value="">Choose…</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>{ing.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>

          <div className="alchemy-actions">
            <button type="button" className="alchemy-action" onClick={handleBrewPotion} disabled={busy}>
              <img src={brewIcon} alt="" />
              Brew potion
            </button>
            <button type="button" className="alchemy-action" onClick={() => setConfirmForage(true)} disabled={busy || !playerId}>
              <img src={forageIcon} alt="" />
              Forage
            </button>
          </div>

          <div className="alchemy-footer">
            <Link className="lx-btn lx-btn--secondary" to="/knowledge">Knowledge book</Link>
            <button type="button" className="lx-btn lx-btn--secondary" onClick={fetchInventory} disabled={loading}>
              Refresh
            </button>
            <Link className="lx-btn lx-btn--secondary" to="/app-selector">All apps</Link>
          </div>
        </div>

        {animationType && (
          <div className={`animation-overlay ${animationType === 'brew' ? 'brew-animation' : 'forage-animation'}`} aria-hidden="true">
            <img src={animationType === 'brew' ? brewIcon : forageIcon} alt="" style={{ width: 150, height: 150 }} />
          </div>
        )}
        {consumeAnimationType && (
          <div
            className={`animation-overlay ${consumeAnimationType === 'consumePotion' ? 'consume-potion-animation' : 'consume-ingredient-animation'}`}
            aria-hidden="true"
          >
            <img
              src={consumeAnimationType === 'consumePotion' ? consumePotionIcon : consumeIngredientIcon}
              alt=""
              style={{ width: 150, height: 150 }}
            />
          </div>
        )}

        {selectedItem && (
          <ItemModal item={selectedItem} type={selectedType} onClose={closeModal} onConsume={handleConsume} busy={busy} />
        )}
        {confirmForage && (
          <ConfirmDialog
            title="Forage today?"
            message="Did Alex tell you you can forage for today?"
            confirmLabel="Forage"
            onConfirm={handleForage}
            onCancel={() => setConfirmForage(false)}
          />
        )}
        <Toast toast={toast} onDismiss={dismissToast} />
      </main>
    </>
  );
};

export default AlchemyDashboard;
