import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  options: Option[] | string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  otherLabel?: string;
  otherPlaceholder?: string;
}

const OTHER_VALUE = "__other__";

const normalize = (opts: Option[] | string[]): Option[] =>
  opts.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );

/**
 * A Select that always offers an "Other" option at the bottom which switches
 * to a free-text Input so the user can type their own value. Used for event
 * type / district / city / state dropdowns site-wide.
 */
const SelectWithOther: React.FC<Props> = ({
  value,
  onChange,
  options,
  placeholder = "Select",
  disabled = false,
  className,
  triggerClassName,
  otherLabel = "Other (type manually)",
  otherPlaceholder = "Type here…",
}) => {
  const opts = normalize(options);
  const knownValues = React.useMemo(() => new Set(opts.map((o) => o.value)), [opts]);
  // If value is non-empty and not a known option → treat as "Other"
  const isOther = value !== "" && !knownValues.has(value);
  const [otherMode, setOtherMode] = React.useState(isOther);
  const [customValue, setCustomValue] = React.useState(isOther ? value : "");

  React.useEffect(() => {
    if (isOther) {
      setOtherMode(true);
      setCustomValue(value);
    }
  }, [value, isOther]);

  const handleSelect = (v: string) => {
    if (v === OTHER_VALUE) {
      setOtherMode(true);
      setCustomValue("");
      onChange("");
    } else {
      setOtherMode(false);
      setCustomValue("");
      onChange(v);
    }
  };

  if (otherMode) {
    return (
      <div className={cn("flex gap-1.5", className)}>
        <Input
          value={customValue}
          onChange={(e) => {
            setCustomValue(e.target.value);
            onChange(e.target.value);
          }}
          placeholder={otherPlaceholder}
          disabled={disabled}
          className={cn("rounded-xl h-11 flex-1", triggerClassName)}
        />
        <button
          type="button"
          onClick={() => {
            setOtherMode(false);
            setCustomValue("");
            onChange("");
          }}
          className="text-[10px] text-primary font-sans hover:underline px-2 shrink-0"
          aria-label="Back to dropdown"
        >
          ← List
        </button>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={handleSelect} disabled={disabled}>
      <SelectTrigger className={cn("rounded-xl h-11", triggerClassName, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72 z-[300] bg-popover">
        {opts.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
        <SelectItem value={OTHER_VALUE} className="font-semibold text-primary">
          {otherLabel}
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

export default SelectWithOther;
