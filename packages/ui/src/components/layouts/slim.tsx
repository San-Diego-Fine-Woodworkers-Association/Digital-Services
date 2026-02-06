import React from 'react';
import { Separator } from '@/components/ui/separator';

interface SlimProps {
  logo?: React.ReactNode;
  menu?: React.ReactNode;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  children?: React.ReactNode;
}

export function Slim({
  logo,
  menu,
  leftContent,
  rightContent,
  children,
}: SlimProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full">
        <div className="flex justify-center py-6">
          {logo}
        </div>

        {/* Menu */}
        {menu && (
          <div className="flex justify-center pb-4">
            {menu}
          </div>
        )}

        {/* Separator */}
        <Separator className="w-full" />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex w-full">
        {/* Left Sidebar */}
        {leftContent && (
          <aside className="flex-shrink-0">
            {leftContent}
          </aside>
        )}

        {/* Center Content */}
        <div className="flex-1">
          {children}
        </div>

        {/* Right Sidebar */}
        {rightContent && (
          <aside className="flex-shrink-0">
            {rightContent}
          </aside>
        )}
      </main>
    </div>
  );
}