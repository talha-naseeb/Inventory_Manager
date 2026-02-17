import React, { useState } from "react";
import { DateRangePicker } from "react-date-range";
import type { RangeKeyDict, Range } from "react-date-range";
import { Calendar as CalendarIcon, X, ChevronDown } from "lucide-react";
import { Button } from "../ui/Button";
import { format, subDays } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { cn } from "../../lib/utils";

interface DateRangeFilterProps {
  onRangeChange: (range: Range) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ onRangeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<Range[]>([
    {
      startDate: subDays(new Date(), 7),
      endDate: new Date(),
      key: "selection",
    },
  ]);

  const handleSelect = (ranges: RangeKeyDict) => {
    const selection = ranges.selection;
    setState([selection]);
    onRangeChange(selection);
  };

  return (
    <div className='relative'>
      <Button
        variant='outline'
        className='flex items-center gap-3 px-4 h-11 bg-white dark:bg-dark-surface border-slate-200 dark:border-dark-border rounded-xl shadow-sm hover:shadow-md transition-all'
        onClick={() => setIsOpen(!isOpen)}
      >
        <CalendarIcon size={18} className='text-primary' />
        <span className='font-bold text-xs text-slate-600 dark:text-slate-300'>
          {format(state[0].startDate!, "MMM dd")} - {format(state[0].endDate!, "MMM dd, yyyy")}
        </span>
        <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <div className='absolute right-0 top-full mt-2 z-50 p-2 bg-white dark:bg-dark-surface rounded-2xl shadow-2xl border border-slate-100 dark:border-dark-border animate-in fade-in slide-in-from-top-1'>
          <div className='flex justify-end p-2 border-b border-slate-50 dark:border-dark-border mb-2'>
            <button onClick={() => setIsOpen(false)} className='p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full text-slate-500'>
              <X size={16} />
            </button>
          </div>
          <div className='overflow-x-auto'>
            <DateRangePicker
              onChange={handleSelect}
              moveRangeOnFirstSelection={false}
              months={1}
              ranges={state}
              direction='horizontal'
              rangeColors={["#6366f1"]}
              className='bg-transparent dark:text-white'
            />
          </div>
        </div>
      )}
    </div>
  );
};
