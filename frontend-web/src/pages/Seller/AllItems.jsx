import React, { useState } from 'react';
import { Search } from 'lucide-react';

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3.5rem', gap: '1.5rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>Your Items</h1>
        
        {/* Search Bar */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1.5rem', width: '100%', maxWidth: '600px', borderRadius: '30px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
          <Search size={22} style={{ color: 'var(--text-secondary)', marginRight: '1rem' }} />
          <input
            type="text"
            placeholder="Search your inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'white', 
              outline: 'none', 
              width: '100%',
              fontSize: '1.1rem'
            }}
          />
        </div>
      </div>

      {/* Items Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '2rem' 
      }}>
        {filteredItems.map(item => (
          <div key={item.id} className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.3s ease', cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ height: '200px', width: '100%', overflow: 'hidden', position: 'relative' }}>
              <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ 
                position: 'absolute', 
                top: '10px', 
                right: '10px', 
                background: 'rgba(0,0,0,0.7)',
                padding: '0.3rem 0.8rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                color: item.condition === 'Brand New' ? '#00f5d4' : item.condition === 'Rent' ? '#fee440' : '#f15bb5'
              }}>
                {item.condition}
              </div>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{item.name}</h3>
              <p style={{ color: 'var(--primary-hover)', fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{item.price}</p>
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            No items found matching "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
};

export default AllItems;
