import { useCallback, useRef } from 'react';
import axios from 'axios';

export function useDebouncedApi<T = any>(url: string, delay: number = 600) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCall = useCallback((data: T) => {
    return new Promise<any>((resolve, reject) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        try {
          const response = await axios.post(url, data);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }, [url, delay]);

  return debouncedCall;
} 