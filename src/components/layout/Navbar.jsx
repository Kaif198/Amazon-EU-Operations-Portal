import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown } from 'lucide-react';
import { STATIONS } from '../../data/stationData.js';

/**
 * Fixed top navigation bar — Amazon #131921 dark, orange search button, station selector.
 */
export default function Navbar({ selectedStation, onStationChange, alertCount = 7 }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showStationDropdown, setShowStationDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.toLowerCase().trim();
    const match = STATIONS.find(s =>
      s.name.toLowerCase().includes(query) ||
      s.code.toLowerCase().includes(query)
    );

    if (match) {
      navigate(`/stations?id=${match.id}`);
      setSearchQuery('');
    } else {
      alert(`No matching station found for "${searchQuery}".`);
    }
  };

  const currentStation = selectedStation === 'all'
    ? 'All EU Stations'
    : STATIONS.find(s => s.id === selectedStation)?.name || 'All EU Stations';

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      backgroundColor: '#131921',
      borderBottom: '1px solid #3D4F5F',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: '16px'
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '200px' }}>
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg"
          alt="Amazon"
          style={{ height: '24px', filter: 'brightness(0) invert(1)', marginTop: '4px' }}
        />
        <div style={{ width: '1px', height: '20px', backgroundColor: '#3D4F5F' }} />
        <span style={{ color: '#E5E7EB', fontSize: '13px', whiteSpace: 'nowrap', fontWeight: 500, letterSpacing: '0.3px' }}>
          Central Ops
        </span>
      </div>

      {/* Search bar */}
      <div style={{ flex: 1, maxWidth: '600px', display: 'flex' }}>
        <select style={{
          backgroundColor: '#F3F3F3',
          border: '1px solid #CCC',
          borderRight: 'none',
          borderRadius: '4px 0 0 4px',
          padding: '0 8px',
          fontSize: '12px',
          color: '#333',
          cursor: 'pointer',
          height: '34px',
          minWidth: '80px'
        }}>
          <option>All</option>
          <option>Stations</option>
          <option>Drivers</option>
          <option>Routes</option>
        </select>
        <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', position: 'relative', zIndex: 2001 }}>
          <input
            type="text"
            placeholder="Search stations, drivers, routes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              height: '34px',
              padding: '0 12px',
              border: '1px solid #CCC',
              borderLeft: 'none',
              borderRight: 'none',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#FFF'
            }}
          />
          <button type="submit" style={{
            backgroundColor: '#FF9900',
            border: '1px solid #FF9900',
            borderRadius: '0 4px 4px 0',
            height: '34px',
            padding: '0 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={16} color="#131921" />
          </button>
        </form>
      </div>

      {/* Right side controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
        {/* Station selector */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowStationDropdown(!showStationDropdown)}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #556',
              borderRadius: '4px',
              color: '#EEE',
              padding: '5px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              maxWidth: '180px',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentStation}</span>
            <ChevronDown size={14} />
          </button>

          {showStationDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '4px',
              backgroundColor: '#FFF',
              border: '1px solid #DDD',
              borderRadius: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 2000,
              minWidth: '220px',
              maxHeight: '320px',
              overflowY: 'auto'
            }}>
              <div
                onClick={() => { onStationChange('all'); setShowStationDropdown(false); }}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  borderBottom: '1px solid #EEE',
                  backgroundColor: selectedStation === 'all' ? '#FFFBF0' : '#FFF',
                  color: selectedStation === 'all' ? '#FF9900' : '#111'
                }}
              >
                All EU Stations
              </div>
              {STATIONS.map(s => (
                <div
                  key={s.id}
                  onClick={() => { onStationChange(s.id); setShowStationDropdown(false); }}
                  style={{
                    padding: '8px 14px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    backgroundColor: selectedStation === s.id ? '#FFFBF0' : '#FFF',
                    color: selectedStation === s.id ? '#FF9900' : '#111',
                    borderBottom: '1px solid #F5F5F5',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F5F9FE'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedStation === s.id ? '#FFFBF0' : '#FFF'}
                >
                  <span>{s.name}</span>
                  <span style={{ color: '#999', fontSize: '11px' }}>{s.code}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notification bell */}
        <div style={{ position: 'relative', zIndex: 2001 }}>
          <div style={{ cursor: 'pointer' }} onClick={() => setShowNotifications(!showNotifications)}>
            <Bell size={20} color="#CCC" />
            {alertCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                backgroundColor: '#CC0C39',
                color: '#FFF',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                fontSize: '10px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>{alertCount}</span>
            )}
          </div>

          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: '-10px',
              marginTop: '12px',
              backgroundColor: '#FFF',
              border: '1px solid #DDD',
              borderRadius: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 2002,
              width: '300px',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', fontWeight: 700, fontSize: '14px', backgroundColor: '#F9FAFB' }}>
                Notifications
              </div>
              {alertCount > 0 ? (
                <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', fontSize: '13px' }}>
                  <div style={{ color: '#CC0C39', fontWeight: 600, marginBottom: '4px' }}>System Alert</div>
                  <div style={{ color: '#565959' }}>You have {alertCount} critical anomalies detected in the network. Please review the Dashboard for details.</div>
                </div>
              ) : (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                  No new notifications.
                </div>
              )}
              <div style={{ padding: '10px', textAlign: 'center', cursor: 'pointer', color: '#007185', fontSize: '13px', fontWeight: 500 }} onClick={() => setShowNotifications(false)}>
                Mark all as read
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div style={{
          width: '32px',
          height: '32px',
          backgroundColor: '#FF9900',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#131921',
          fontWeight: 700,
          fontSize: '12px',
          cursor: 'pointer'
        }}>
          MK
        </div>
      </div>

      {/* Backdrop for dropdowns */}
      {(showStationDropdown || showNotifications) && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1999, backgroundColor: 'transparent' }}
          onClick={() => { setShowStationDropdown(false); setShowNotifications(false); }}
        />
      )}
    </nav>
  );
}
