import React, { useState } from 'react';

/**
 * Amazon-style tab interface.
 * Active tab has #FF9900 2px bottom border.
 *
 * Props:
 *   tabs — array of { label, content } or { label, key }
 *   onTabChange — optional callback when tab changes
 *   defaultTab — initial active tab index (default 0)
 */
export default function TabInterface({ tabs = [], onTabChange, defaultTab = 0, children }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabClick = (idx) => {
    setActiveTab(idx);
    onTabChange?.(idx);
  };

  return (
    <div>
      {/* Tab headers */}
      <div className="tab-container">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            className={`tab-item${activeTab === idx ? ' active' : ''}`}
            onClick={() => handleTabClick(idx)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ paddingTop: '16px' }}>
        {tabs[activeTab]?.content ?? children}
      </div>
    </div>
  );
}
