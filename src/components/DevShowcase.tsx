import React, { useState } from 'react';
import { SCREENS, findScreenByPathOrAlias } from '../screensData';
import { ScreenDefinition, ScreenCategory, ViewportMode } from '../types';

export const DevShowcase: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ScreenCategory>('storefront');
  const [activeScreen, setActiveScreen] = useState<ScreenDefinition>(SCREENS[0]);
  const [viewport, setViewport] = useState<ViewportMode>('mobile');

  const filteredScreens = SCREENS.filter((s) => s.category === selectedCategory);

  const handleSelectScreen = (screen: ScreenDefinition) => {
    setActiveScreen(screen);
    setViewport(screen.defaultViewport);
  };

  const storefrontCount = SCREENS.filter((s) => s.category === 'storefront').length;
  const adminCount = SCREENS.filter((s) => s.category === 'admin').length;
  const brandCount = SCREENS.filter((s) => s.category === 'brand').length;

  return (
    <div id="dev-showcase-root" className="flex flex-col h-screen bg-[#111827] text-[#f9fafb] font-sans overflow-hidden">
      {/* Dev Header */}
      <header id="dev-showcase-header" className="h-14 bg-[#1f2937] border-b border-[#374151] px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#2d6857] flex items-center justify-center font-bold text-white text-xs">
              SM
            </div>
            <span className="font-semibold text-sm tracking-wide">SOULMATE</span>
            <span className="text-xs px-2 py-0.5 rounded bg-[#374151] text-emerald-400 font-mono">
              Dev Showcase
            </span>
          </div>

          <div className="h-4 w-px bg-[#374151]" />

          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-lg">
            <button
              id="dev-tab-storefront"
              type="button"
              onClick={() => {
                setSelectedCategory('storefront');
                const first = SCREENS.find((s) => s.category === 'storefront');
                if (first) handleSelectScreen(first);
              }}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                selectedCategory === 'storefront'
                  ? 'bg-[#2d6857] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Storefront ({storefrontCount})
            </button>
            <button
              id="dev-tab-admin"
              type="button"
              onClick={() => {
                setSelectedCategory('admin');
                const first = SCREENS.find((s) => s.category === 'admin');
                if (first) handleSelectScreen(first);
              }}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                selectedCategory === 'admin'
                  ? 'bg-[#2d6857] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Back Office ({adminCount})
            </button>
            <button
              id="dev-tab-brand"
              type="button"
              onClick={() => {
                setSelectedCategory('brand');
                const first = SCREENS.find((s) => s.category === 'brand');
                if (first) handleSelectScreen(first);
              }}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                selectedCategory === 'brand'
                  ? 'bg-[#2d6857] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Brand ({brandCount})
            </button>
          </div>
        </div>

        {/* Screen Selector & Viewport */}
        <div className="flex items-center gap-3">
          <select
            id="dev-screen-select"
            value={activeScreen.id}
            onChange={(e) => {
              const found = SCREENS.find((s) => s.id === e.target.value);
              if (found) handleSelectScreen(found);
            }}
            className="bg-[#111827] text-xs text-gray-200 border border-[#374151] rounded-md px-3 py-1.5 focus:outline-none focus:border-emerald-500 max-w-[280px]"
          >
            {filteredScreens.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.path})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-lg">
            <button
              id="dev-viewport-mobile"
              type="button"
              onClick={() => setViewport('mobile')}
              className={`px-2.5 py-1 text-xs rounded font-medium ${
                viewport === 'mobile' ? 'bg-[#374151] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Mobile
            </button>
            <button
              id="dev-viewport-tablet"
              type="button"
              onClick={() => setViewport('tablet')}
              className={`px-2.5 py-1 text-xs rounded font-medium ${
                viewport === 'tablet' ? 'bg-[#374151] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Tablet
            </button>
            <button
              id="dev-viewport-desktop"
              type="button"
              onClick={() => setViewport('desktop')}
              className={`px-2.5 py-1 text-xs rounded font-medium ${
                viewport === 'desktop' ? 'bg-[#374151] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Desktop
            </button>
          </div>

          <a
            id="dev-open-prod-link"
            href={activeScreen.path}
            className="text-xs px-2.5 py-1 rounded bg-[#374151] hover:bg-[#4b5563] text-gray-200"
          >
            Open Real Route ↗
          </a>
        </div>
      </header>

      {/* Frame Container */}
      <div id="dev-canvas-area" className="flex-1 bg-[#0b0f17] flex items-center justify-center p-4 overflow-auto">
        <div
          className={`transition-all duration-300 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col ${
            viewport === 'mobile'
              ? 'w-[390px] h-[844px] max-h-full'
              : viewport === 'tablet'
              ? 'w-[768px] h-[950px] max-h-full'
              : 'w-full h-full'
          }`}
        >
          <iframe
            src={activeScreen.htmlPath}
            title={activeScreen.title}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
};
