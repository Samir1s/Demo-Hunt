import React from 'react';

const CrtOverlay: React.FC = () => {
  return (
    <>
      {/* Scanline Overlay */}
      <div className="fixed inset-0 crt-overlay pointer-events-none z-50"></div>
      
      {/* Subtle vignette/corner darkening */}
      <div className="fixed inset-0 pointer-events-none z-40 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>
    </>
  );
};

export default CrtOverlay;
