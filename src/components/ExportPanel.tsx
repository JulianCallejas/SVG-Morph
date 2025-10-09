// Legacy ExportPanel - kept for backward compatibility
// Use EnhancedExportPanel for new features
import React from 'react';
import { EnhancedExportPanel } from './EnhancedExportPanel';
import type { AnimationSettings } from '../store/morphStore';

interface ExportPanelProps {
  canExport: boolean;
  animationSettings: AnimationSettings;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  canExport,
  animationSettings,
}) => {
  // Use the enhanced export panel with all new features
  return <EnhancedExportPanel />;
};