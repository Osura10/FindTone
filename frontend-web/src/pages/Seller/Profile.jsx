import React from 'react';
import { Mail, Phone, MapPin, Briefcase } from 'lucide-react';

const dummyUser = {
  name: "Music World Pro",
  ownerName: "John Doe",
  email: "contact@musicworldpro.com",
  phone: "+1 (555) 123-4567",
  address: "123 Melody Lane, Nashville, TN",
  role: "seller",
  shopRegisterId: "REG-2023-8921",
  joined: "October 2023",
  avatar: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=200"
};

const dummyItems = [
  { id: 1, name: 'Fender Stratocaster', price: '$850', condition: 'Used', image: 'https://images.unsplash.com/photo-1564186763535-ebb55ef3d1db?auto=format&fit=crop&q=80&w=300' },
  { id: 2, name: 'Yamaha Acoustic F310', price: '$150', condition: 'Brand New', image: 'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?auto=format&fit=crop&q=80&w=300' },
  { id: 3, name: 'Roland Juno-DS61', price: '$700', condition: 'Used', image: 'https://images.unsplash.com/photo-1595069906974-f9ae71b504f2?auto=format&fit=crop&q=80&w=300' },
  { id: 4, name: 'Shure SM58 Mic', price: '$99', condition: 'Brand New', image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80&w=300' },
];

const Profile = () => {
  return (
    <div className="animate-fade-in-up" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3.5rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>Seller Profile</h1>
      </div>
      
      <div className="glass-panel" style={{ padding: '3rem', position: 'relative', overflow: 'hidden', maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Decorative background element inside the card */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, var(--primary-color) 0%, transparent 70%)',
          opacity: '0.2',
          filter: 'blur(40px)',
          zIndex: 0
        }}></div>

        <div style={{ display: 'flex', gap: '3rem', position: 'relative', zIndex: 1 }}>
          {/* Avatar Section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ 
              width: '150px', 
              height: '150px', 
              borderRadius: '50%', 
              overflow: 'hidden',
              border: '4px solid rgba(255,255,255,0.1)',
              boxShadow: '0 0 20px rgba(123, 44, 191, 0.4)'
            }}>
              <img src={dummyUser.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ 
              background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
              padding: '0.3rem 1rem',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Verified Seller
            </span>
          </div>

          {/* Details Section */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0' }}>{dummyUser.name}</h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1.1rem' }}>Managed by {dummyUser.ownerName}</p>
            </div>

            <div style={{ height: '1px', background: 'var(--glass-border)', width: '100%' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <Mail size={20} style={{ color: 'var(--accent-color)' }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Email</p>
                  <p style={{ margin: 0, fontWeight: '500' }}>{dummyUser.email}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <Phone size={20} style={{ color: '#00f5d4' }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Phone</p>
                  <p style={{ margin: 0, fontWeight: '500' }}>{dummyUser.phone}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <MapPin size={20} style={{ color: '#fee440' }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Location</p>
                  <p style={{ margin: 0, fontWeight: '500' }}>{dummyUser.address}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <Briefcase size={20} style={{ color: '#9b5de5' }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Business Reg ID</p>
                  <p style={{ margin: 0, fontWeight: '500' }}>{dummyUser.shopRegisterId}</p>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* Seller's Posts Section */}
      <div style={{ marginTop: '5rem', padding: '0 2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
          <h2 className="text-gradient" style={{ fontSize: '2rem', margin: 0 }}>Posts by {dummyUser.name}</h2>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '2rem' 
        }}>
          {dummyItems.map(item => (
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
        </div>
      </div>
    </div>
  );
};

export default Profile;
