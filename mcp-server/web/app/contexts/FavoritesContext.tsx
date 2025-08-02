'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';
import { getUserToken } from '../insightsClient';

interface FavoritesContextType {
  savedSet: Set<string>;
  toggleFavorite: (jobId: string, save: boolean) => Promise<void>;
  refetchFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
}

interface FavoritesProviderProps {
  children: ReactNode;
}

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());

  // Fetch favorites from server
  const fetchFavorites = useCallback(async () => {
    try {
      const userToken = getUserToken();
      const response = await axios.get('/api/favorites', {
        params: { userToken }
      });
      
      const favoriteIds = (response.data.ids || []).map((id: string) => String(id));
      setSavedSet(new Set(favoriteIds));
    } catch (err) {
      console.error('Could not fetch favorites', err);
      setSavedSet(new Set());
    }
  }, []);

  // Add favorite to local state
  const addFavorite = (jobIdStr: string) => {
    setSavedSet(prev => {
      const next = new Set(prev);
      next.add(jobIdStr);
      return next;
    });
  };

  // Remove favorite from local state  
  const removeFavorite = (jobIdStr: string) => {
    setSavedSet(prev => {
      const next = new Set(prev);
      next.delete(jobIdStr);
      return next;
    });
  };

  const toggleFavorite = async (jobId: string, save: boolean) => {
    try {
      const jobIdStr = String(jobId); // Ensure string type
      const userToken = getUserToken();
      
      await axios.post('/api/favorites', {
        objectID: jobIdStr,
        userToken,
        save,
      });
      
      if (save) {
        addFavorite(jobIdStr);
      } else {
        removeFavorite(jobIdStr);
      }
    } catch (err) {
      console.error('Could not toggle favorite', err);
      throw err;
    }
  };

  const refetchFavorites = async () => {
    await fetchFavorites();
  };

  // Fetch favorites on mount
  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return (
    <FavoritesContext.Provider value={{ savedSet, toggleFavorite, refetchFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
}