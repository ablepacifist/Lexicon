import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV = [
    { icon: '🗺️', label: 'Map',     path: '/pokemon'           },
    { icon: '📖', label: 'Pokédex', path: '/pokemon/pokedex'   },
    { icon: '🔴', label: 'Pokémon', path: '/pokemon/pokemon'   },
    { icon: '🥚', label: 'Eggs',    path: '/pokemon/eggs'      },
    { icon: '🎒', label: 'Items',   path: '/pokemon/items'     },
    { icon: '🛒', label: 'Shop',    path: '/pokemon/shop'      },
    { icon: '👤', label: 'Trainer', path: '/profile'           },
];

export default function PokeNavBar() {
    const navigate  = useNavigate();
    const location  = useLocation();

    return (
        <nav style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999,
            background: 'rgba(10,14,26,0.96)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', justifyContent: 'space-around',
            paddingTop: 6,
            paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        }}>
            {NAV.map(item => {
                const active = location.pathname === item.path
                    || (item.path !== '/pokemon' && location.pathname.startsWith(item.path));
                return (
                    <button key={item.path} onClick={() => navigate(item.path)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 2, padding: '2px 6px',
                        color: active ? '#ef4444' : '#64748b',
                        transition: 'color 0.15s',
                        WebkitTapHighlightColor: 'transparent',
                    }}>
                        <span style={{ fontSize: 20 }}>{item.icon}</span>
                        <span style={{ fontSize: 9, fontWeight: active ? 700 : 400, letterSpacing: 0.1 }}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
}
