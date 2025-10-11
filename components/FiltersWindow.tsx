import React from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import { WindowType } from '../types';

interface FilterSettings {
  scanlines: { enabled: boolean; opacity: number; density: number };
  crt: { enabled: boolean; intensity: number };
  bloom: { enabled: boolean; intensity: number };
  chromaticAberration: { enabled: boolean; intensity: number };
}

interface FiltersWindowProps {
  title: string;
  onClose: () => void;
  filters: FilterSettings;
  onFiltersChange: (settings: FilterSettings) => void;
  onReset: () => void;
  onOpenWindow: (window: WindowType) => void;
}

const FilterSection: React.FC<{ title: string; enabled: boolean; onToggle: () => void; children?: React.ReactNode }> = ({ title, enabled, onToggle, children }) => (
  <div className="p-2 border-t-2 border-cyan-400/50 first:border-t-0">
    <div className="flex items-center justify-between mb-2">
      <h4 className="font-bold text-fuchsia-400">{title}</h4>
      <input type="checkbox" checked={enabled} onChange={onToggle} />
    </div>
    {enabled && <div className="flex flex-col gap-2">{children}</div>}
  </div>
);

const LabeledSlider: React.FC<{ label: string; value: number | string; min: string; max: string; step: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, value, ...props }) => (
  <div className="flex items-center gap-2">
    <label className="w-24 flex-shrink-0 capitalize">{label}:</label>
    <input type="range" value={value} {...props} className="w-full" />
    <span className="w-8 text-right">{value}</span>
  </div>
);

const FiltersWindow: React.FC<FiltersWindowProps> = ({ title, onClose, filters, onFiltersChange, onReset, onOpenWindow }) => {

  const handleFilterChange = (filterName: keyof FilterSettings, property: string, value: any) => {
    onFiltersChange({
      ...filters,
      [filterName]: {
        ...filters[filterName],
        [property]: value,
      },
    });
  };

  const handleToggle = (filterName: keyof FilterSettings) => {
    onFiltersChange({
      ...filters,
      [filterName]: {
        ...filters[filterName],
        enabled: !filters[filterName].enabled,
      },
    });
  };

  return (
    <DraggableWindow title={title} onClose={onClose} width="w-[350px]" height="h-auto">
      <div className="bg-transparent h-full flex flex-col p-1 text-xs text-cyan-300">
        
        <FilterSection title="Scanlines" enabled={filters.scanlines.enabled} onToggle={() => handleToggle('scanlines')}>
          <LabeledSlider
            label="Opacity"
            value={filters.scanlines.opacity}
            min="0" max="1" step="0.01"
            onChange={e => handleFilterChange('scanlines', 'opacity', parseFloat(e.target.value))}
          />
          <LabeledSlider
            label="Density"
            value={filters.scanlines.density}
            min="1" max="4" step="1"
            onChange={e => handleFilterChange('scanlines', 'density', parseInt(e.target.value))}
          />
        </FilterSection>

        <FilterSection title="CRT Curvature" enabled={filters.crt.enabled} onToggle={() => handleToggle('crt')}>
          <LabeledSlider
            label="Intensity"
            value={filters.crt.intensity}
            min="0" max="100" step="1"
            onChange={e => handleFilterChange('crt', 'intensity', parseInt(e.target.value))}
          />
        </FilterSection>

        <FilterSection title="Bloom" enabled={filters.bloom.enabled} onToggle={() => handleToggle('bloom')}>
          <LabeledSlider
            label="Intensity"
            value={filters.bloom.intensity}
            min="0" max="100" step="1"
            onChange={e => handleFilterChange('bloom', 'intensity', parseInt(e.target.value))}
          />
        </FilterSection>
        
        <FilterSection title="Chromatic Aberration" enabled={filters.chromaticAberration.enabled} onToggle={() => handleToggle('chromaticAberration')}>
          <LabeledSlider
            label="Intensity"
            value={filters.chromaticAberration.intensity}
            min="0" max="5" step="0.1"
            onChange={e => handleFilterChange('chromaticAberration', 'intensity', parseFloat(e.target.value))}
          />
        </FilterSection>

        <div className="p-2 mt-2 flex flex-col gap-2">
            <PixelatedButton onClick={() => onOpenWindow(WindowType.PREVIEW)} className="w-full">Open Preview</PixelatedButton>
            <PixelatedButton onClick={onReset} className="w-full">Reset All</PixelatedButton>
        </div>

      </div>
    </DraggableWindow>
  );
};

export default FiltersWindow;
