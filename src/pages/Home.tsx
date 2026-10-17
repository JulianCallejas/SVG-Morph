import React from 'react';
import { BuiltOn } from '../components/home/BuiltOn';
import { Closing } from '../components/home/Closing';
import { ExportFormats } from '../components/home/ExportFormats';
import { HeroMorph } from '../components/home/HeroMorph';
import { HowItWorks } from '../components/home/HowItWorks';
import { ToolsShowcase } from '../components/home/ToolsShowcase';
import { useReveal } from '../hooks/useReveal';

export const Home: React.FC = () => {
  useReveal();

  return (
    <main>
      <HeroMorph />
      <HowItWorks />
      <ToolsShowcase />
      <ExportFormats />
      <BuiltOn />
      <Closing />
    </main>
  );
};
