import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface ItemType {
  id: number;
  itemtype: string;
}

interface Color {
  id: number;
  color_name: string;
  primary_color: string;
}

interface Party {
  id: string;
  party_id: string;
  name: string;
}

interface Design {
  design_number: string;
  item_type: string;
  colors: {
    id: number;
    color_name: string;
    primary_color: string;
  }[];
}

interface TransportOption {
  id: number;
  transport_name: string;
  description: string;
}

interface DataContextType {
  // Data
  itemTypes: ItemType[];
  colors: Color[];
  parties: Party[];
  designs: Design[];
  transportOptions: TransportOption[];
  
  // Loading states
  itemTypesLoading: boolean;
  colorsLoading: boolean;
  partiesLoading: boolean;
  designsLoading: boolean;
  transportLoading: boolean;
  
  // Error states
  itemTypesError: string;
  colorsError: string;
  partiesError: string;
  designsError: string;
  transportError: string;
  
  // Refresh functions
  refreshItemTypes: () => Promise<void>;
  refreshColors: () => Promise<void>;
  refreshParties: () => Promise<void>;
  refreshDesigns: () => Promise<void>;
  refreshTransport: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  
  // Data states
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [transportOptions, setTransportOptions] = useState<TransportOption[]>([]);
  
  // Loading states
  const [itemTypesLoading, setItemTypesLoading] = useState(false);
  const [colorsLoading, setColorsLoading] = useState(false);
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [designsLoading, setDesignsLoading] = useState(false);
  const [transportLoading, setTransportLoading] = useState(false);
  
  // Error states
  const [itemTypesError, setItemTypesError] = useState('');
  const [colorsError, setColorsError] = useState('');
  const [partiesError, setPartiesError] = useState('');
  const [designsError, setDesignsError] = useState('');
  const [transportError, setTransportError] = useState('');
  
  // Cache timestamps to determine if data needs refresh
  const [lastFetch, setLastFetch] = useState({
    itemTypes: 0,
    colors: 0,
    parties: 0,
    designs: 0,
    transport: 0
  });
  
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const shouldRefresh = (dataType: keyof typeof lastFetch) => {
    return Date.now() - lastFetch[dataType] > CACHE_DURATION;
  };

  const fetchItemTypes = async (force = false) => {
    if (!token) return;
    if (!force && itemTypes.length > 0 && !shouldRefresh('itemTypes')) return;
    
    setItemTypesLoading(true);
    setItemTypesError('');
    
    try {
        const response = await fetch(`${process.env.API_URL}/api/designs/item-types`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch item types');
      }

      const data = await response.json();
      setItemTypes(data.itemTypes);
      setLastFetch(prev => ({ ...prev, itemTypes: Date.now() }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch item types';
      setItemTypesError(errorMessage);
      console.error('Item types fetch error:', err);
    } finally {
      setItemTypesLoading(false);
    }
  };

  const fetchColors = async (force = false) => {
    if (!token) return;
    if (!force && colors.length > 0 && !shouldRefresh('colors')) return;
    
    setColorsLoading(true);
    setColorsError('');
    
    try {
        const response = await fetch(`${process.env.API_URL}/api/designs/colors`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch colors');
      }

      const data = await response.json();
      setColors(data.colors);
      setLastFetch(prev => ({ ...prev, colors: Date.now() }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch colors';
      setColorsError(errorMessage);
      console.error('Colors fetch error:', err);
    } finally {
      setColorsLoading(false);
    }
  };

  const fetchParties = async (force = false) => {
    if (!token) return;
    if (!force && parties.length > 0 && !shouldRefresh('parties')) return;
    
    setPartiesLoading(true);
    setPartiesError('');
    
    try {
        const response = await fetch(`${process.env.API_URL}/api/orders/parties`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch parties');
      }

      const data = await response.json();
      setParties(data.parties);
      setLastFetch(prev => ({ ...prev, parties: Date.now() }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch parties';
      setPartiesError(errorMessage);
      console.error('Parties fetch error:', err);
    } finally {
      setPartiesLoading(false);
    }
  };

  const fetchDesigns = async (force = false) => {
    if (!token) return;
    if (!force && designs.length > 0 && !shouldRefresh('designs')) return;
    
    setDesignsLoading(true);
    setDesignsError('');
    
    try {
        const response = await fetch(`${process.env.API_URL}/api/orders/designs`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch designs');
      }

      const data = await response.json();
      setDesigns(data.designs);
      setLastFetch(prev => ({ ...prev, designs: Date.now() }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch designs';
      setDesignsError(errorMessage);
      console.error('Designs fetch error:', err);
    } finally {
      setDesignsLoading(false);
    }
  };

  const fetchTransport = async (force = false) => {
    if (!token) return;
    if (!force && transportOptions.length > 0 && !shouldRefresh('transport')) return;
    
    setTransportLoading(true);
    setTransportError('');
    
    try {
        const response = await fetch(`${process.env.API_URL}/api/orders/transport`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transport options');
      }

      const data = await response.json();
      setTransportOptions(data.transportOptions);
      setLastFetch(prev => ({ ...prev, transport: Date.now() }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transport options';
      setTransportError(errorMessage);
      console.error('Transport options fetch error:', err);
    } finally {
      setTransportLoading(false);
    }
  };

  // Public refresh functions
  const refreshItemTypes = () => fetchItemTypes(true);
  const refreshColors = () => fetchColors(true);
  const refreshParties = () => fetchParties(true);
  const refreshDesigns = () => fetchDesigns(true);
  const refreshTransport = () => fetchTransport(true);
  
  const refreshAll = async () => {
    await Promise.all([
      fetchItemTypes(true),
      fetchColors(true),
      fetchParties(true),
      fetchDesigns(true),
      fetchTransport(true)
    ]);
  };

  // Initial data fetch when token is available
  useEffect(() => {
    if (token) {
      fetchItemTypes();
      fetchColors();
      fetchParties();
      fetchDesigns();
      fetchTransport();
    }
  }, [token]);

  return (
    <DataContext.Provider value={{
      // Data
      itemTypes,
      colors,
      parties,
      designs,
      transportOptions,
      
      // Loading states
      itemTypesLoading,
      colorsLoading,
      partiesLoading,
      designsLoading,
      transportLoading,
      
      // Error states
      itemTypesError,
      colorsError,
      partiesError,
      designsError,
      transportError,
      
      // Refresh functions
      refreshItemTypes,
      refreshColors,
      refreshParties,
      refreshDesigns,
      refreshTransport,
      refreshAll
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};