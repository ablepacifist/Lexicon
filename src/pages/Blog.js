import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import beachImg from '../assets/images/extra_photos/beach.JPEG';
import './PageStyles.css';

// Starter blog posts — these can later be replaced with a backend/CMS
const initialPosts = [
  {
    id: 1,
    title: 'Welcome to My Blog',
    date: '2026-02-20',
    excerpt: 'Hey everyone! This is the first post on my new personal blog. I built this site as a hub for all my interests — career updates, baking adventures, D&D campaigns, and software projects. Stay tuned for more content!',
    content: `Hey everyone!\n\nThis is the first post on my new personal blog. I've been meaning to set up a space like this for a while — somewhere I can share thoughts, document projects, and keep a record of the things I'm passionate about.\n\nA bit about what you'll find here:\n\n• Career updates from my work at MMCD as a Field Operations Supervisor\n• Baking and cooking experiments (with plenty of photos)\n• D&D campaign logs and world-building notes\n• Software project updates and technical write-ups\n• Nature adventures and travel stories\n\nI'm excited to start sharing. Thanks for stopping by!`,
    tags: ['Personal', 'Update'],
  },
  {
    id: 2,
    title: 'Building a Metrics System for MMCD',
    date: '2026-02-20',
    excerpt: 'One of the biggest projects I\'ve been working on at the Metropolitan Mosquito Control District is a comprehensive metrics tracking system. Here\'s a peek at what that looks like.',
    content: `One of the biggest projects I've been working on at MMCD is a comprehensive metrics tracking system.\n\nThe district does incredible work in mosquito disease prevention, but like many government agencies, there's always room to improve how we measure and track our effectiveness. That's where I come in.\n\nThe metrics system I'm building helps the organization:\n\n• Track field operation outcomes across districts\n• Measure productivity and resource allocation\n• Visualize trends over time\n• Generate reports for stakeholders\n\nIt's been a rewarding challenge — combining my love for software development with meaningful public health work. More details to come as the project evolves!`,
    tags: ['Career', 'Tech', 'MMCD'],
  },
];

const Blog = () => {
  const [selectedPost, setSelectedPost] = useState(null);
  const posts = initialPosts;

  return (
    <div className="page">
      <Navbar />

      {/* Hero */}
      <div className="page-hero">
        <div className="page-hero-bg" style={{ backgroundImage: `url(${beachImg})` }}></div>
        <div className="page-hero-overlay"></div>
        <div className="page-hero-content">
          <h1 className="page-hero-title">Blog</h1>
          <p className="page-hero-subtitle">Thoughts, stories, and updates</p>
        </div>
      </div>

      <section className="page-section">
        <div className="page-container narrow">
          {selectedPost ? (
            /* Full post view */
            <div>
              <button
                onClick={() => setSelectedPost(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8b8bf5',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: '2rem',
                  padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                &larr; Back to all posts
              </button>
              <article>
                <h1 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 700, margin: '0 0 0.75rem', letterSpacing: '-0.02em' }}>
                  {selectedPost.title}
                </h1>
                <p style={{ color: '#8b8bf5', fontSize: '0.9rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
                  {new Date(selectedPost.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                  {selectedPost.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
                <div style={{ color: '#b0b0c0', fontSize: '1.05rem', lineHeight: 1.9, whiteSpace: 'pre-line' }}>
                  {selectedPost.content}
                </div>
              </article>
            </div>
          ) : (
            /* Post list view */
            <div>
              <p style={{ color: '#888', fontSize: '1rem', marginBottom: '2.5rem', lineHeight: 1.6 }}>
                Welcome to my blog. I write about tech, work, baking, D&D, and whatever else is on my mind.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {posts.map(post => (
                  <article
                    key={post.id}
                    className="content-card"
                    onClick={() => setSelectedPost(post)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, flex: 1 }}>{post.title}</h3>
                      <span style={{ color: '#666', fontSize: '0.85rem', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                        {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                      {post.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                    <p>{post.excerpt}</p>
                    <span style={{ color: '#6366f1', fontSize: '0.9rem', fontWeight: 600, marginTop: '0.75rem', display: 'inline-block' }}>
                      Read more &rarr;
                    </span>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="page-footer">
        <p>&copy; {new Date().getFullYear()} Alex Dyakin</p>
      </footer>
    </div>
  );
};

export default Blog;
