import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import bakingHero from '../assets/images/extra_photos/baking_1.JPG';
import cakeImg from '../assets/images/extra_photos/alex_cake.JPG';
import cookiesImg from '../assets/images/extra_photos/cookies.JPG';
import cooking1 from '../assets/images/extra_photos/cooking_1.JPG';
import cooking2 from '../assets/images/extra_photos/cooking_2.JPG';
import baking2 from '../assets/images/extra_photos/baking_2.JPG';
import happyCake from '../assets/images/extra_photos/happy_cake.JPEG';
import byteMeCake from '../assets/images/extra_photos/byteMe_cake.JPEG';
import cakeFridge from '../assets/images/extra_photos/cake_in_fridge.JPEG';
import dndCake from '../assets/images/extra_photos/dnd_cake.JPG';
import meAlexCake from '../assets/images/extra_photos/me_and_alex_cake.JPG';
import meByteCake from '../assets/images/extra_photos/me_and_byteme_cake.JPEG';
import './PageStyles.css';

const CATEGORIES = ['All', 'Baking', 'Cooking'];

const recipes = [
  {
    id: 1,
    title: 'Byte Me Cake',
    category: 'Baking',
    image: byteMeCake,
    description: 'A fun themed cake — perfect for developer parties. Layered chocolate with buttercream frosting.',
  },
  {
    id: 2,
    title: 'Homemade Cookies',
    category: 'Baking',
    image: cookiesImg,
    description: 'Classic homemade cookies — crispy edges with a chewy center. A crowd favorite.',
  },
  {
    id: 3,
    title: 'Celebration Cake',
    category: 'Baking',
    image: happyCake,
    description: 'A festive layered cake with colorful decorations for special occasions.',
  },
  {
    id: 4,
    title: 'D&D Game Night Cake',
    category: 'Baking',
    image: dndCake,
    description: 'Themed cake for D&D game nights — because every campaign deserves dessert.',
  },
  {
    id: 5,
    title: 'Home Cooking',
    category: 'Cooking',
    image: cooking1,
    description: 'Everyday home cooking — hearty and delicious meals from scratch.',
  },
  {
    id: 6,
    title: 'Kitchen Creations',
    category: 'Cooking',
    image: cooking2,
    description: 'Experimenting with new recipes and techniques in the kitchen.',
  },
  {
    id: 7,
    title: 'Special Occasion Cake',
    category: 'Baking',
    image: cakeImg,
    description: 'Custom decorated cakes for birthdays and celebrations.',
  },
  {
    id: 8,
    title: 'Fridge-Ready Masterpiece',
    category: 'Baking',
    image: cakeFridge,
    description: 'Multi-layer cake chilling in the fridge — patience is the secret ingredient.',
  },
  {
    id: 9,
    title: 'Bakery Experiments',
    category: 'Baking',
    image: baking2,
    description: 'Trying new baking techniques and flavor combinations.',
  },
];

const Recipes = () => {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? recipes
    : recipes.filter(r => r.category === activeCategory);

  return (
    <div className="page">
      <Navbar />

      {/* Hero */}
      <div className="page-hero">
        <div className="page-hero-bg" style={{ backgroundImage: `url(${bakingHero})` }}></div>
        <div className="page-hero-overlay"></div>
        <div className="page-hero-content">
          <h1 className="page-hero-title">Recipes</h1>
          <p className="page-hero-subtitle">Baking, cooking, and everything delicious</p>
        </div>
      </div>

      {/* Gallery Section */}
      <section className="page-section">
        <div className="page-container">
          {/* Category Filter */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: activeCategory === cat ? '#6366f1' : 'rgba(255,255,255,0.1)',
                  background: activeCategory === cat ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: activeCategory === cat ? '#8b8bf5' : '#888',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Recipe Grid */}
          <div className="grid-3">
            {filtered.map(recipe => (
              <div key={recipe.id} className="image-card">
                <img src={recipe.image} alt={recipe.title} />
                <div className="image-card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0 }}>{recipe.title}</h3>
                    <span className="tag">{recipe.category}</span>
                  </div>
                  <p>{recipe.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Photos */}
      <section className="page-section alt">
        <div className="page-container">
          <h2 className="page-section-title">From the Kitchen</h2>
          <div className="page-section-divider"></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="image-card">
              <img src={meAlexCake} alt="Baking together" style={{ aspectRatio: '4/3' }} />
              <div className="image-card-body">
                <h3>Baking with Friends</h3>
                <p>Some of the best cakes are made together.</p>
              </div>
            </div>
            <div className="image-card">
              <img src={meByteCake} alt="Cake presentation" style={{ aspectRatio: '4/3' }} />
              <div className="image-card-body">
                <h3>The Finished Product</h3>
                <p>The best part — showing off the final creation.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="page-footer">
        <p>&copy; {new Date().getFullYear()} Alex Dyakin</p>
      </footer>
    </div>
  );
};

export default Recipes;
