'use client';

import { Cloud, CloudRain, Sun } from 'lucide-react';

interface WeatherDay {
  day: string;
  icon: 'sun' | 'cloud' | 'rain';
  temp: number;
}

interface WeatherWidgetProps {
  location: string;
  currentTemp: number;
  currentDescription: string;
  forecast: WeatherDay[];
}

const iconMap = {
  sun: Sun,
  cloud: Cloud,
  rain: CloudRain,
};

export function WeatherWidget({
  location,
  currentTemp,
  currentDescription,
  forecast,
}: WeatherWidgetProps) {
  const CurrentIcon = Sun;

  return (
    <div className="relative overflow-hidden rounded-xl p-[18px] h-fit bg-gradient-to-br from-[#1E3A4D] to-[#0E1F2A] border border-gs-info-soft">
      {/* Glow effect */}
      <div className="absolute top-2 right-4 w-[130px] h-[130px] rounded-full bg-gs-info-soft blur-3xl opacity-30" />

      {/* Content */}
      <div className="relative z-10">
        {/* Location */}
        <p className="text-xs text-white/60 uppercase tracking-[0.08em] font-medium">
          {location}
        </p>

        {/* Current Weather */}
        <div className="flex gap-3 mt-3 mb-4">
          <div className="flex-shrink-0">
            <CurrentIcon size={40} className="text-[#B8D4E8]" />
          </div>
          <div>
            <div className="font-display text-5xl font-bold text-white leading-[0.95] tracking-[-0.02em]">
              {currentTemp}°
            </div>
            <p className="text-xs text-white/75 mt-[2px]">{currentDescription}</p>
          </div>
        </div>

        {/* Forecast */}
        <div className="border-t border-white/10 pt-[10px] mt-3">
          <div className="flex justify-between gap-2">
            {forecast.map((day, idx) => {
              const Icon = iconMap[day.icon];
              return (
                <div key={idx} className="text-center flex-1">
                  <p className="text-xs text-white/60 mb-1">{day.day}</p>
                  <Icon size={18} className="text-[#B8D4E8] mx-auto mb-1" />
                  <p className="font-mono text-xs font-semibold text-white">
                    {day.temp}°
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
