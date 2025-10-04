import React, { useEffect, useState, useContext } from 'react';
import { UserContext } from '../context/UserContext';
import { Link } from 'react-router-dom';
import background from '../assets/images/dashboard_background.jpg';
import ItemModal from '../components/ItemModal'; // Ensure this component exists
import '../animations.css';
import brewIcon from '../assets/images/brew.png';
import forageIcon from '../assets/images/forage.png';
import consumePotionIcon from '../assets/images/drink.png';
import consumeIngredientIcon from '../assets/images/consume.png';

const API_URL = process.env.REACT_APP_API_URL;


const Dashboard = () => {
  const { user } = useContext(UserContext);
  console.log('DASHBOARD mounted. User:', user);
  const playerId = user?.id; // Assumes the user object contains an 'id' field
  console.log('Player Id from context:', playerId);

  // State for inventory data
  const [ingredients, setIngredients] = useState([]);
  const [potions, setPotions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Brew selection state for two ingredients
  const [brewSelection, setBrewSelection] = useState({ ingredient1: '', ingredient2: '' });

  // State for the modal (detailed view)
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedType, setSelectedType] = useState(''); // "ingredient" or "potion"

  const [animationType, setAnimationType] = useState(null);
  const [consumeAnimationType, setConsumeAnimationType] = useState(null);

  // Fetch the player's inventory from the API
  const fetchInventory = async () => {
    if (playerId === undefined || playerId === null) return;
    setLoading(true);
    console.log(`Sending fetch request to inventory API for player: ${playerId}`);
    try {
      const response = await fetch(`${API_URL}/player/inventory/${playerId}`,{
        credentials: 'include'
      });
      console.log("HTTP status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("Inventory data fetched:", data);
        setIngredients(data.ingredients || []);
        setPotions(data.potions || []);
      } else {
        const errMsg = await response.text();
        console.error("Fetch inventory failed with error:", errMsg);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (playerId !== undefined && playerId !== null) {
      console.log('Fetching inventory for player:', playerId);
      fetchInventory();
    } else {
      console.log('Player ID is undefined or null, not fetching inventory.');
    }
  }, [playerId]);

  // Handle brewing a potion
  const handleBrewPotion = async () => {
    if (!brewSelection.ingredient1 || !brewSelection.ingredient2) {
      alert('Please select both ingredients for brewing.');
      return;
    }
    try {
      setAnimationType('brew');
      setTimeout(() => setAnimationType(null), 2000);

      const response = await fetch(`${API_URL}/potion/brew`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          ingredientId1: parseInt(brewSelection.ingredient1, 10),
          ingredientId2: parseInt(brewSelection.ingredient2, 10),
        }),
      });
      if (response.ok) {
        alert('Potion brewed successfully!');
        fetchInventory(); // Refresh inventory after brewing
      } else {
        const errMsg = await response.text();
        alert(`Brew failed: ${errMsg}`);
      }
    } catch (error) {
      console.error('Error brewing potion:', error);
      alert('Error brewing potion.');
    }
  };

  // Handle foraging
  const handleForage = async () => {
    if (playerId === undefined || playerId === null) return;
    const confirmed = window.confirm('Are you sure? Did Alex tell you you can forage for today?');
    if (!confirmed) return;
    try {
            setAnimationType('forage');
      setTimeout(() => setAnimationType(null), 2000);
      
      const response = await fetch(`${API_URL}/player/forage/${playerId}`, {
        credentials: 'include',
        method: 'GET',
      });
      if (response.ok) {
        const data = await response.json();
        alert(`Foraged ingredient: ${data.forage}`);
        fetchInventory(); // Refresh inventory after foraging
      } else {
        const errMsg = await response.text();
        alert(`Forage failed: ${errMsg}`);
      }
    } catch (error) {
      console.error('Error executing forage:', error);
      alert('Error executing forage.');
    }
  };

  // Handle consume from the modal
  const handleConsume = async () => {
    if (!selectedItem || playerId === undefined || playerId === null) return;
    if (selectedType === 'ingredient') {
      try {
        const response = await fetch(`${API_URL}/player/ingredient/consume`, {
          credentials: 'include',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, ingredientId: selectedItem.id })
        });
        if (response.ok) {
          alert('Ingredient consumed successfully!');
            setConsumeAnimationType('consumeIngredient');
  setTimeout(() => setConsumeAnimationType(null), 2000);
          closeModal();
          fetchInventory();
        } else {
          const errMsg = await response.text();
          alert(`Failed to consume ingredient: ${errMsg}`);
        }
      } catch (error) {
        console.error('Error consuming ingredient:', error);
        alert('Error consuming ingredient.');
      }
    } else if (selectedType === 'potion') {
      try {
        const response = await fetch(`${API_URL}/player/potion/consume`, {
          credentials: 'include',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, potionId: selectedItem.id })
        });
        if (response.ok) {
          alert('Potion consumed successfully!');
            setConsumeAnimationType('consumePotion');
  setTimeout(() => setConsumeAnimationType(null), 2000);
          closeModal();
          fetchInventory();
        } else {
          const errMsg = await response.text();
          alert(`Failed to consume potion: ${errMsg}`);
        }
      } catch (error) {
        console.error('Error consuming potion:', error);
        alert('Error consuming potion.');
      }
    }
  };

  // Modal Handlers
  const openModal = (item, type) => {
    setSelectedItem(item);
    setSelectedType(type);
  };

  const closeModal = () => {
    setSelectedItem(null);
    setSelectedType('');
  };

  // Manually refresh inventory
  const handleRefresh = () => {
    fetchInventory();
  };

  // --- Styles ---
  const containerStyle = {
    backgroundImage: `url(${background})`,
    backgroundSize: 'cover',
    minHeight: '100vh',
    color: '#fff',
    textAlign: 'center',
    padding: '2rem',
  };

  const headerStyle = { marginBottom: '1rem' };

  const columnsContainer = {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: '2rem',
  };

  const listContainer = {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '8px',
    padding: '1rem',
    width: '40%',
    maxHeight: '400px',
    overflowY: 'scroll',
    cursor: 'pointer', // indicate clickable items
  };

  // Button style
  const buttonStyle = {
    margin: '0.5rem',
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    borderRadius: '5px',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#61dafb',
    color: '#000',
    fontWeight: 'bold',
    boxShadow: '1px 1px 5px rgba(0, 0, 0, 0.4)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  };

 const formLabelStyle = { marginRight: '1.2rem', color: '#000' };

return (
  <div style={containerStyle}>
    <h1 style={headerStyle}>
      Welcome, {user && user.username ? user.username : 'User'}!
    </h1>

    <div style={columnsContainer}>
      {/* Ingredients List */}
      <div style={listContainer}>
        <h2>Ingredients</h2>
        {loading ? (
          <p>Loading...</p>
        ) : ingredients.length === 0 ? (
          <p>No ingredients available.</p>
        ) : (
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {ingredients.map((ing) => (
              <li key={ing.id} onClick={() => openModal(ing, 'ingredient')}>
                <strong>{ing.name}</strong> (x{ing.quantity})
                {ing.effects && ing.effects.length > 0 && (
                  <ul style={{ listStyleType: 'circle' }}>
                    {ing.effects.map((effect, idx) => (
                      <li key={idx}>{effect.title}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Potions List */}
      <div style={listContainer}>
        <h2>Potions</h2>
        {loading ? (
          <p>Loading...</p>
        ) : potions.length === 0 ? (
          <p>No potions brewed yet.</p>
        ) : (
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {potions.map((pot) => (
              <li key={pot.id} onClick={() => openModal(pot, 'potion')}>
                <strong>{pot.name}</strong> (x{pot.quantity})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>

    {/* Brew & Forage Section */}
    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
      <h2>Brew &amp; Forage</h2>
      {/* Container for ingredient selectors */}
      <div
        style={{
          backgroundColor: 'rgba(255,255,255,0.9)',
          border: '1px solid #ccc',
          padding: '1rem',
          borderRadius: '5px',
          display: 'inline-block',
          marginBottom: '1rem'
        }}
      >
        <div style={{ marginBottom: '0.5rem' }}>
          <label style={{ ...formLabelStyle, color: '#000' }}>
            Ingredient 1:
            <select
              value={brewSelection.ingredient1}
              onChange={(e) =>
                setBrewSelection({ ...brewSelection, ingredient1: e.target.value })
              }
              style={{ marginLeft: '0.5rem', color: '#000' }}
            >
              <option value="">Select</option>
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <label style={{ ...formLabelStyle, color: '#000' }}>
            Ingredient 2:
            <select
              value={brewSelection.ingredient2}
              onChange={(e) =>
                setBrewSelection({ ...brewSelection, ingredient2: e.target.value })
              }
              style={{ marginLeft: '0.5rem', color: '#000' }}
            >
              <option value="">Select</option>
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {/* Replace the buttons with clickable images */}
      <div>
        <img
          src={brewIcon}
          alt="Brew Potion"
          style={{ cursor: 'pointer', border: '2px solid black', width: '150px', height: '150px', margin: '0.5rem' }}
          onClick={handleBrewPotion}
        />
        <img
          src={forageIcon}
          alt="Forage"
          style={{ cursor: 'pointer', border: '2px solid black', width: '150px', height: '150px', margin: '0.5rem' }}
          onClick={handleForage}
        />
      </div>
    </div>

    {/* Navigation Buttons */}
    <div style={{ textAlign: 'center' }}>
      <Link to="/profile">
        <button style={buttonStyle}>Profile</button>
      </Link>
      <Link to="/knowledge">
        <button style={buttonStyle}>Knowledge Book</button>
      </Link>
      <button style={buttonStyle} onClick={handleRefresh}>
        Refresh Inventory
      </button>
    </div>

    {/* Animation Overlay for Brew/Forage */}
    {animationType && (
      <div
        className={`animation-overlay ${animationType === 'brew' ? 'brew-animation' : 'forage-animation'}`}
      >
        <img
          src={animationType === 'brew' ? brewIcon : forageIcon}
          alt="Animation"
          style={{ width: '150px', height: '150px' }}
        />
      </div>
    )}

    {/* Animation Overlay for Consumption */}
    {consumeAnimationType && (
      <div
        className={`animation-overlay ${
          consumeAnimationType === 'consumePotion'
            ? 'consume-potion-animation'
            : 'consume-ingredient-animation'
        }`}
      >
        <img
          src={
            consumeAnimationType === 'consumePotion'
              ? consumePotionIcon
              : consumeIngredientIcon
          }
          alt="Consume Animation"
          style={{ width: '150px', height: '150px' }}
        />
      </div>
    )}

    {/* Modal for Detailed View */}
    {selectedItem && (
      <ItemModal
        item={selectedItem}
        type={selectedType}
        onClose={closeModal}
        onConsume={handleConsume}
      />
    )}
  </div>
);

}
export default Dashboard;