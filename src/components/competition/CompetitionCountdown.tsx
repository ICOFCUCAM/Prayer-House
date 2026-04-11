import { useState, useEffect } from 'react';

interface Props {
  /** ISO date string for the deadline (end date) */
  deadline: string;
  /** Show labels under numbers (default true) */
  showLabels?: boolean;
  /** Small variant: compact font sizes */
  compact?: boolean;
}

/**
 * Auto-updating countdown display.  Updates every second.
 */
export default function CompetitionCountdown({ deadline, showLabels = true, compact = false }: Props) {
  const [t, setT] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: false });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) {
        setT({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: true });
        return;
      }
      setT({
        days:    Math.floor(diff / 86400000),
        hours:   Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        ended:   false,
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (t.ended) {
    return <span className="text-gray-500 text-xs font-medium">Ended</span>;
  }

  const units: [string, number][] = [
    ['d', t.days], ['h', t.hours], ['m', t.minutes], ['s', t.seconds],
  ];

  return (
    <div className="flex gap-1.5">
      {units.map(([label, val]) => (
        <div
          key={label}
          className={`bg-white/5 rounded-lg text-center ${compact ? 'px-1.5 py-0.5 min-w-[30px]' : 'px-2 py-1 min-w-[38px]'}`}
        >
          <p className={`text-white font-bold tabular-nums ${compact ? 'text-[11px]' : 'text-xs'}`}>
            {String(val).padStart(2, '0')}
          </p>
          {showLabels && (
            <p className={`text-gray-600 ${compact ? 'text-[8px]' : 'text-[9px]'}`}>{label}</p>
          )}
        </div>
      ))}
    </div>
  );
}
