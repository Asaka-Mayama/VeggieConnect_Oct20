import React from 'react';
import { ArrowLeft, Sprout } from 'lucide-react';
import { ProjectGuideModal } from './ProjectGuideModal';

// Standalone public page for the Project Guide, reachable at /system.
// Reuses the exact same ProjectGuideModal content, just rendered on a full page.
export const SystemGuidePage: React.FC = () => {
  const goHome = () => {
    try {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (e) {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center py-6 px-3">
      <div className="w-full max-w-lg mb-3 flex items-center justify-between">
        <button
          onClick={goHome}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-emerald-800 font-bold text-xs hover:bg-emerald-50 transition-all cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to VeggieConnect</span>
        </button>
        <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-950">
          <Sprout className="w-4 h-4 text-emerald-600" />
          VeggieConnect
        </span>
      </div>
      {/* Guide content rendered inline as a page card (always open) */}
      <div className="w-full max-w-lg">
        <ProjectGuideModal isOpen={true} onClose={goHome} isPage={true} />
      </div>
    </div>
  );
};