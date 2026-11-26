import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import beachImg from '../assets/images/extra_photos/beach.webp';
import './PageStyles.css';
import { parseLocalDate } from '../utils/dates';

// Starter blog posts — these can later be replaced with a backend/CMS
const initialPosts = [
  {
    id: 3,
    title: "My 2026 Wishlist: 20 Things I'm Hunting Down (and Where to Find Them)",
    date: '2026-11-20',
    excerpt: 'A little bit of retro gaming, storage, LEGO, maker gear, games, plants, and tea. Here are 20 things on my wishlist—and where I plan to look for them.',
    content: `Some of these are practical, some are very much not, and a few are projects waiting to happen. Either way, here are 20 things I'm hoping to track down in 2026—and where to start looking.

1. RetroTINK-4K CE
The crown jewel of my retro gaming wishlist. The RetroTINK-4K CE is the more affordable version of the RetroTINK-4K platform, with the same core hardware and firmware framework as the Pro, built around a smaller FPGA in a lighter case with a red PCB. It can upscale my retro consoles for modern 4K displays, and its built-in profiles should make it easy to get great-looking results out of the box.
Where to buy: Directly from retrotink.com; MSRP is $475 USD. Restocks sell out quickly, so the official advice is to sign up for notifications rather than pay scalper prices.

2. Any SAS HDD at or over 1TB
Time to feed the Lexicon. SAS drives are enterprise workhorses, and older capacities can be inexpensive on the used market. Anything 1TB or larger should do the job.
Where to buy: eBay (look for highly rated sellers and tested drives), ServerPartDeals for refurbished enterprise drives, or local surplus and recovery shops. The homelab community is also a good place to compare vendors and ask whether a listing looks worthwhile.

3. Any SATA HDD over 8TB
The bulk-storage sibling of item two: a drive over 8TB for media archives and backups.
Where to buy: eBay, ServerPartDeals, and GoHardDrive are common places to look for recertified drives. Shucking an external drive is another option, but recertified drives have become competitive enough that I may just buy one.

4. A Roomba
I mean a robot vacuum. Anything that can help keep the floors clean while I'm doing something else is a win.
Where to buy: Amazon, Best Buy, and Walmart carry current models. Refurbished units also turn up through Amazon Renewed and eBay.

5. Something to Mount My TV On
A proper wall mount—ideally a full-motion arm—would free up space and finally get the viewing angle right.
Where to buy: Amazon, Ace Hardware, Monoprice, Best Buy, or IKEA. First I'll need to check the TV's VESA pattern and decide between a fixed mount, tilt, or full articulation.

6. Any LEGO, Especially UCS Sets
Ultimate Collector Series sets are big, display-worthy builds. The Executor and AT-AT are exactly the kind of sets I have in mind.
Where to buy: LEGO.com and LEGO Stores for current sets; Target and Walmart for sales; and BrickLink, local buy/sell groups, or eBay for retired sets. The rare ones can get painfully expensive.

7. Han Solo Jacket
I lost my jacket, and I'm very sad about it. The ideal replacement would be based on Han Solo's look in Solo: A Star Wars Story.
Where to buy: Replica-focused makers such as Magnoli Clothiers, or independent costume makers. Etsy can help me discover makers, but I'd rather buy directly from the creator's own shop. eBay and costume shops are options if I'm after the general vibe rather than screen accuracy.

8. A V100 or an RTX 3090, 4090, or 5090
A Tesla V100 is the exotic option, and used cards have been showing up as data-center hardware is retired. A GeForce flagship is the more practical choice. Either way, prices and availability can be well above MSRP, so this one will take some patience.
Where to buy: For a V100, check eBay and server-surplus sellers. For RTX cards, try Newegg, Amazon, Best Buy, and Micro Center. Used 3090s and 4090s also appear on eBay and r/hardwareswap; check seller feedback and test a card promptly after it arrives.

9. 3D Filament and/or Resin
Filament for the FDM printers, resin for the resin printers. I don't like Amazon, and Micro Center sells both.
Where to buy: Micro Center is my first stop.

10. A New Resin Printer
My current resin printer has served honorably, but a newer one could mean a larger build plate, faster print times, and—most importantly—no pieces of circuitry hanging off it.
Where to buy: Elegoo, Anycubic, and Phrozen sell directly, often with bundles that include wash-and-cure stations. r/resinprinting is a good place to see what owners think of current models.

11. Raspberry Pi (Two Picos and a Pi 4, any size)
Two Raspberry Pi Picos for little projects and a Pi 4 for always-on duties.
Where to buy: Raspberry Pi's approved resellers, including Micro Center, are the reliable route. Avoid marketplace scalpers, and use stock trackers such as rpilocator to see who's carrying boards.

12. Xbox One Elite Controller
Swappable back paddles and interchangeable thumbsticks—it's still one of the best-feeling controllers I've used.
Where to buy: Best Buy or Microsoft's refurbished store. Used Elite Series 1 controllers are more affordable now; just confirm the paddles and accessories are included, since they are often sold separately.

13. Something for My Walls (or for the Things That Need to Go on the Walls)
Shelving, pegboards, floating shelves, picture ledges—anything that helps the room feel finished and gets things off the floor.
Where to buy: IKEA for classics like the SKÅDIS pegboard and shelving. For handmade pieces, Etsy is useful for finding creators, but I'll look for the maker's own store to buy directly.

14. Slay the Spire: The Board Game
One of my favorite games, now as a cooperative deck-building tabletop game.
Where to buy: Check a friendly local game store or online shops such as GameNerdz; the retail edition has been listed around $125, though prices can change. The Collector's Edition is more expensive and available through Contention Games. For Downfall expansion news, keep an eye on Contention's site and newsletter.

15. Halo: Flashpoint
Mantic Games' officially licensed Halo miniatures game. Build a fireteam of Spartans, ODSTs, or Banished and play fast, skirmish-scale battles.
Where to buy: Directly from Mantic Games—the Spartan Edition starter set is the entry point—or from local game stores and online retailers that stock Mantic. The Mantic store is the best place to check preorder availability.

16. Any Game on Steam
Lord Gaben, have my money.
Where to buy: Steam, obviously. Humble Bundle and Fanatical are also worth watching for discounts and bundles; Humble bundles include charity donations.

17. Outdoor Furniture (Like a Bar)
An outdoor bar setup with a proper counter and stools, plus a planter box for a summer garden.
Where to buy: Check outdoor-furniture sections at IKEA, Home Depot, Lowe's, and local garden centers. A local patio or garden shop may have sturdier options, and Wayfair has plenty to compare online.

18. Unreal Assets
Environments, characters, VFX packs, sound libraries, and all the other pieces that help bring a project together.
Where to buy: Fab is Epic's marketplace for Unreal assets. Itch.io has indie-made tools and packs, and some creators also list cross-engine assets on the Unity Asset Store. Epic's free-asset offers are worth keeping an eye on, too.

19. Plants
Houseplants, maybe something ambitious, and definitely something that makes a room feel finished.
Where to buy: Your choice! A local nursery, garden center, plant shop, or community plant swap all sound like good places to start.

20. Tea
Something delicious to drink while I work through the rest of this list. I'm open to trying new kinds, especially if I can sample a few before committing to a whole tin.
Where to buy: A local tea shop is ideal for recommendations and samples. Specialty tea shops and reputable online tea sellers are good options, too.`,
    tags: ['Wishlist', 'Gaming', 'Tech', 'Hobbies'],
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
                  {parseLocalDate(selectedPost.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
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
              <p style={{ color: '#a0a0b0', fontSize: '1rem', marginBottom: '2.5rem', lineHeight: 1.6 }}>
                Welcome to my blog. I write about tech, work, baking, D&D, and whatever else is on my mind.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {posts.map(post => (
                  <article
                    key={post.id}
                    className="content-card"
                    onClick={() => setSelectedPost(post)}
                    // Reachable and openable from the keyboard, not just by clicking.
                    role="button"
                    tabIndex={0}
                    aria-label={`Read: ${post.title}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedPost(post);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Wraps the date under the title on a phone instead of squeezing the title into a column. */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.25rem 1rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, flex: '1 1 14rem' }}>{post.title}</h3>
                      <span style={{ color: '#a0a0b0', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {parseLocalDate(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
