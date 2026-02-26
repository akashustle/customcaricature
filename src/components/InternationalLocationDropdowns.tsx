import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getCountries, getCountryStates, getCountryCities } from "@/lib/countries-data";
import { useState } from "react";

interface Props {
  country: string;
  state: string;
  city: string;
  onCountryChange: (v: string) => void;
  onStateChange: (v: string) => void;
  onCityChange: (v: string) => void;
  showLabels?: boolean;
}

const InternationalLocationDropdowns = ({
  country, state, city,
  onCountryChange, onStateChange, onCityChange,
  showLabels = true,
}: Props) => {
  const [customState, setCustomState] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [isOtherState, setIsOtherState] = useState(false);
  const [isOtherCity, setIsOtherCity] = useState(false);

  const countries = getCountries();
  const states = country ? getCountryStates(country) : [];
  const cities = state && !isOtherState ? getCountryCities(country, state) : [];

  const handleCountryChange = (val: string) => {
    onCountryChange(val);
    onStateChange("");
    onCityChange("");
    setCustomState("");
    setCustomCity("");
    setIsOtherState(false);
    setIsOtherCity(false);
  };

  const handleStateChange = (val: string) => {
    if (val === "__other__") {
      setIsOtherState(true);
      onStateChange("");
      setCustomState("");
      onCityChange("");
      setIsOtherCity(true);
    } else {
      setIsOtherState(false);
      onStateChange(val);
      onCityChange("");
      setCustomCity("");
      setIsOtherCity(false);
    }
  };

  const handleCityChange = (val: string) => {
    if (val === "__other__") {
      setIsOtherCity(true);
      onCityChange("");
      setCustomCity("");
    } else {
      setIsOtherCity(false);
      onCityChange(val);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Country */}
        <div>
          {showLabels && <Label className="font-sans text-xs">Country *</Label>}
          <Select value={country} onValueChange={handleCountryChange}>
            <SelectTrigger><SelectValue placeholder="Select Country" /></SelectTrigger>
            <SelectContent className="max-h-60 z-[100] bg-popover">
              {countries.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* State */}
        <div>
          {showLabels && <Label className="font-sans text-xs">State/Region *</Label>}
          {isOtherState ? (
            <Input
              value={customState}
              onChange={(e) => { setCustomState(e.target.value); onStateChange(e.target.value); }}
              placeholder="Enter state/region"
            />
          ) : (
            <Select value={state} onValueChange={handleStateChange} disabled={!country}>
              <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
              <SelectContent className="max-h-60 z-[100] bg-popover">
                {states.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
                <SelectItem value="__other__">Other</SelectItem>
              </SelectContent>
            </Select>
          )}
          {isOtherState && (
            <button onClick={() => { setIsOtherState(false); onStateChange(""); setCustomState(""); }} className="text-[10px] text-primary font-sans mt-1 hover:underline">← Back to list</button>
          )}
        </div>

        {/* City */}
        <div>
          {showLabels && <Label className="font-sans text-xs">City *</Label>}
          {isOtherCity || isOtherState ? (
            <Input
              value={customCity}
              onChange={(e) => { setCustomCity(e.target.value); onCityChange(e.target.value); }}
              placeholder="Enter city"
            />
          ) : (
            <Select value={cities.includes(city) ? city : ""} onValueChange={handleCityChange} disabled={!state}>
              <SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger>
              <SelectContent className="max-h-60 z-[100] bg-popover">
                {cities.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
                <SelectItem value="__other__">Other</SelectItem>
              </SelectContent>
            </Select>
          )}
          {isOtherCity && !isOtherState && (
            <button onClick={() => { setIsOtherCity(false); onCityChange(""); setCustomCity(""); }} className="text-[10px] text-primary font-sans mt-1 hover:underline">← Back to list</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InternationalLocationDropdowns;
