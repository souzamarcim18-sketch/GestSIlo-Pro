'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useGeocoding, type CityOption } from '@/hooks/useGeocoding';

interface CityAutocompleteProps {
  label?: string;
  placeholder?: string;
  onSelect: (city: CityOption) => void;
  value?: string;
  error?: string;
  disabled?: boolean;
}

/**
 * ──────────────────────────────────────────────────────────────
 * CITY AUTOCOMPLETE COMPONENT
 * ──────────────────────────────────────────────────────────────
 *
 * Autocomplete para cidades brasileiras com busca por Nominatim API
 * - Requer 3+ caracteres para começar
 * - Dropdown de sugestões com lat/lon
 * - Callback ao selecionar uma cidade
 */

export function CityAutocomplete({
  label = 'Cidade',
  placeholder = 'Digite a cidade (ex: Ribeirão Preto)',
  onSelect,
  value: controlledValue = '',
  error,
  disabled = false,
}: CityAutocompleteProps) {
  const [inputValue, setInputValue] = useState(controlledValue);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);

  const { results, loading, error: geocodingError, searchCities, clear } =
    useGeocoding();

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Atualizar input quando value controlado muda
  useEffect(() => {
    setInputValue(controlledValue);
  }, [controlledValue]);

  // Buscar cidades ao digitar
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue.length >= 3) {
        searchCities(inputValue);
        setIsOpen(true);
      } else {
        clear();
        setIsOpen(false);
      }
    }, 300); // debounce 300ms

    return () => clearTimeout(timer);
  }, [inputValue, searchCities, clear]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (city: CityOption) => {
    setSelectedCity(city);
    setInputValue(city.displayName);
    setIsOpen(false);
    onSelect(city);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setSelectedCity(null);
  };

  const displayError = error || geocodingError;
  const showDropdown = isOpen && inputValue.length >= 3;
  const hasResults = results.length > 0;

  return (
    <div className="space-y-2">
      {label && <Label htmlFor="city-autocomplete">{label}</Label>}

      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            id="city-autocomplete"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => inputValue.length >= 3 && setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-10 pr-10"
            autoComplete="off"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}
        </div>

        {/* Dropdown de resultados */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-input rounded-lg shadow-lg z-50">
            {hasResults ? (
              <ul className="max-h-64 overflow-y-auto">
                {results.map((city, idx) => (
                  <li key={`${city.name}-${city.state}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => handleSelect(city)}
                      className={cn(
                        'w-full text-left px-4 py-3 hover:bg-muted transition-colors',
                        'border-b border-border last:border-b-0',
                        'focus:outline-none focus:bg-muted'
                      )}
                    >
                      <p className="font-medium text-sm text-foreground">
                        {city.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {city.state} • {city.latitude.toFixed(4)}°, {city.longitude.toFixed(4)}°
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-6 text-center">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Buscando cidades...</p>
                ) : geocodingError ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    {geocodingError}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma cidade encontrada
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Erro do campo */}
      {displayError && !geocodingError && (
        <p className="text-sm text-destructive">{displayError}</p>
      )}

      {/* Confirmação de seleção */}
      {selectedCity && (
        <p className="text-xs text-green-600 font-medium">
          ✓ Localização definida: {selectedCity.displayName}
        </p>
      )}
    </div>
  );
}
