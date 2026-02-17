import React from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { Button } from "../ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Moon, Sun, RotateCcw } from "lucide-react";
import { cn } from "../../lib/utils";

export const ThemeSettings: React.FC = () => {
  const { isDarkMode, toggleDarkMode, primaryColor, setPrimaryColor, accentColor, setAccentColor, sidebarColor, setSidebarColor, resetTheme } = useThemeStore();

  const presets = [
    { name: "Royal Blue", color: "#2563eb" },
    { name: "Emerald", color: "#059669" },
    { name: "Violet", color: "#7c3aed" },
    { name: "Rose", color: "#e11d48" },
    { name: "Amber", color: "#d97706" },
    { name: "Slate", color: "#475569" },
    { name: "Burgundy", color: "#5e1c1c" },
    { name: "Plum", color: "#842291" },
    { name: "Indigo", color: "#3a2390" },
    { name: "Cerulean", color: "#267aba" },
  ];

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Global Theme Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl'>
            <div className='flex items-center gap-3'>
              <div className='p-2 rounded-xl bg-white dark:bg-dark-surface shadow-sm'>{isDarkMode ? <Moon size={20} className='text-primary' /> : <Sun size={20} className='text-amber-500' />}</div>
              <div>
                <p className='font-bold text-sm'>{isDarkMode ? "Dark Mode" : "Light Mode"}</p>
                <p className='text-xs text-slate-500'>Switch between dark and light themes</p>
              </div>
            </div>
            <Button onClick={toggleDarkMode} variant='outline' size='sm' className='rounded-full'>
              Switch to {isDarkMode ? "Light" : "Dark"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <CardTitle>Visual Identity</CardTitle>
          <Button variant='ghost' size='sm' onClick={resetTheme} className='text-xs gap-2'>
            <RotateCcw size={14} /> Reset
          </Button>
        </CardHeader>
        <CardContent className='space-y-8'>
          {/* Primary Color */}
          <div className='space-y-4'>
            <div className='flex justify-between items-end'>
              <div>
                <h4 className='font-bold text-sm'>Primary Color</h4>
                <p className='text-xs text-slate-500'>Main brand color used for buttons and active states</p>
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              {presets.map((p) => (
                <button
                  key={p.color}
                  onClick={() => setPrimaryColor(p.color)}
                  className={cn("w-8 h-8 rounded-full transition-transform hover:scale-110", primaryColor === p.color && "ring-2 ring-offset-2 ring-primary")}
                  style={{ backgroundColor: p.color }}
                  title={p.name}
                />
              ))}
            </div>
          </div>

          {/* Accent Color */}
          <div className='space-y-4'>
            <div className='flex justify-between items-end'>
              <div>
                <h4 className='font-bold text-sm'>Accent Color</h4>
                <p className='text-xs text-slate-500'>Secondary color used for badges and highlights</p>
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              {presets.map((p) => (
                <button
                  key={`accent-${p.color}`}
                  onClick={() => setAccentColor(p.color)}
                  className={cn("w-8 h-8 rounded-full transition-transform hover:scale-110", accentColor === p.color && "ring-2 ring-offset-2 ring-accent")}
                  style={{ backgroundColor: p.color }}
                  title={p.name}
                />
              ))}
            </div>
          </div>

          {/* Sidebar Color */}
          <div className='space-y-4'>
            <div className='flex justify-between items-end'>
              <div>
                <h4 className='font-bold text-sm'>Sidebar Background</h4>
                <p className='text-xs text-slate-500'>Override the default sidebar color</p>
              </div>
              <div className='flex items-center gap-2'>
                <Button variant='ghost' size='sm' onClick={() => setSidebarColor(null)} className='text-xs'>
                  Default
                </Button>
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              {presets.map((p) => (
                <button
                  key={`sidebar-${p.color}`}
                  onClick={() => setSidebarColor(p.color)}
                  className={cn("w-8 h-8 rounded-full transition-transform hover:scale-110", sidebarColor === p.color && "ring-2 ring-offset-2 ring-primary")}
                  style={{ backgroundColor: p.color }}
                  title={p.name}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
