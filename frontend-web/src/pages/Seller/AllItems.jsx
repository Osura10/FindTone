import React, { useState } from 'react';
import { Search, Music, ShoppingBag, Sparkles } from 'lucide-react';

const dummyItems = [
  { id: 1, name: 'Fender Stratocaster', price: '$850', condition: 'Used', image: 'https://images.unsplash.com/photo-1564186763535-ebb55ef3d1db?auto=format&fit=crop&q=80&w=300' },
  { id: 2, name: 'Yamaha Acoustic F310', price: '$150', condition: 'Brand New', image: 'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?auto=format&fit=crop&q=80&w=300' },
  { id: 3, name: 'Roland Juno-DS61', price: '$700', condition: 'Used', image: 'https://images.unsplash.com/photo-1595069906974-f9ae71b504f2?auto=format&fit=crop&q=80&w=300' },
  { id: 4, name: 'Shure SM58 Mic', price: '$99', condition: 'Brand New', image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80&w=300' },
  { id: 5, name: 'Pearl Drum Kit', price: '$50/day', condition: 'Rent', image: 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?auto=format&fit=crop&q=80&w=300' },
  { id: 6, name: 'Pioneer DJ Controller', price: '$250', condition: 'Used', image: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?auto=format&fit=crop&q=80&w=300' },
];

const AllItems = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = dummyItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in-up" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem', gap: '1rem', textAlign: 'center' }}>
        <h1 className="text-gradient" style={{ fontSize: '2.5rem', margin: 0, fontWeight: '800' }}>Marketplace Items</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: 0, maxWidth: '600px' }}>
          Explore all musical instruments, gear, and equipment available across MusicMarket.
        </p>
        
        {/* Search Bar */}
        <div className="glass-panel" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '0.85rem 1.5rem', 
          width: '100%', 
          maxWidth: '620px', 
          borderRadius: '30px', 
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          marginTop: '0.5rem'
        }}>
          <Search size={22} style={{ color: 'var(--text-secondary)', marginRight: '1rem' }} />
          <input
            type="text"
            placeholder="Search instruments, gear, brands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'white', 
              outline: 'none', 
              width: '100%',
              fontSize: '1rem'
            }}
          />
        </div>
      </div>

      {/* Items Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
        gap: '2rem' 
      }}>
        {filteredItems.map(item => (
          <div 
            key={item.id} 
            className="glass-panel" 
            style={{ 
              overflow: 'hidden', 
              display: 'flex', 
              flexDirection: 'column', 
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
              cursor: 'pointer',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }} 
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.4)';
            }} 
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ height: '200px', width: '100%', overflow: 'hidden', position: 'relative' }}>
              <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ 
                position: 'absolute', 
                top: '12px', 
                right: '12px', 
                background: 'rgba(18, 16, 24, 0.85)',
                backdropFilter: 'blur(8px)',
                padding: '0.35rem 0.8rem',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: item.condition === 'Brand New' ? '#00f5d4' : item.condition === 'Rent' ? '#fee440' : '#f15bb5',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                {item.condition}
              </div>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '600', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h3>
              <p style={{ color: 'var(--primary-hover)', fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>{item.price}</p>
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '1.1rem' }}>No items found matching "{searchTerm}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllItems;
